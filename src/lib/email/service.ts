import "server-only";

import type { Json } from "@/lib/supabase/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendViaSmtp, type SmtpTransportConfig } from "./smtp";

export type TransactionalEmailInput = {
  html?: string;
  logHtml?: string | null;
  logMetadata?: Json;
  logText?: string;
  metadata?: Json;
  notificationId?: string | null;
  orderId?: string | null;
  recipientEmail: string;
  replyTo?: string;
  skipDeliveryReason?: string;
  subject: string;
  supportTicketId?: string | null;
  text: string;
};

export type EmailDispatchResult = {
  delivered: boolean;
  fallback: boolean;
  logId: string | null;
  ok: boolean;
  provider: "log_only" | "smtp";
  reason?: string;
  status: "failed" | "sent" | "skipped";
};

type SmtpState =
  | { config: SmtpTransportConfig; ready: true }
  | { ready: false; reason: string };

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function getSmtpState(): SmtpState {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const portValue = process.env.SMTP_PORT?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const password =
    process.env.SMTP_PASSWORD?.trim() ?? process.env.SMTP_PASS?.trim() ?? "";
  const fromAddressValue =
    process.env.EMAIL_FROM_ADDRESS?.trim() ??
    process.env.SMTP_FROM_EMAIL?.trim() ??
    process.env.SMTP_FROM?.trim() ??
    user;
  const fromAddress = extractEmailAddress(fromAddressValue);
  const fromName = process.env.EMAIL_FROM_NAME?.trim() ?? "GoldHelwah GmbH";

  if (!host || !portValue || !user || !fromAddress) {
    return {
      ready: false,
      reason: "smtp_not_configured",
    };
  }

  if (!password) {
    return {
      ready: false,
      reason: "smtp_missing_password",
    };
  }

  const port = Number(portValue);

  if (!Number.isFinite(port) || port <= 0) {
    return {
      ready: false,
      reason: "smtp_invalid_port",
    };
  }

  return {
    config: {
      fromAddress,
      fromHeader: `${fromName} <${fromAddress}>`,
      host,
      password,
      port,
      rejectUnauthorized:
        process.env.SMTP_TLS_REJECT_UNAUTHORIZED?.trim().toLowerCase() !== "false",
      secure:
        process.env.SMTP_SECURE?.trim().toLowerCase() === "true" || port === 465,
      user,
    },
    ready: true,
  };
}

async function createEmailLog(input: {
  errorMessage?: string | null;
  metadata: Json;
  notificationId?: string | null;
  orderId?: string | null;
  provider: string;
  recipientEmail: string;
  status: "failed" | "pending" | "sent" | "skipped";
  subject: string;
  supportTicketId?: string | null;
  text: string;
}) {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("email_logs")
      .insert({
        body_text: input.text,
        error_message: input.errorMessage ?? null,
        metadata_json: input.metadata,
        notification_id: input.notificationId ?? null,
        order_id: input.orderId ?? null,
        provider: input.provider,
        recipient_email: input.recipientEmail,
        status: input.status,
        subject: input.subject,
        support_ticket_id: input.supportTicketId ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.warn(`[email] Unable to create email log: ${error.message}`);
      return null;
    }

    return data.id;
  } catch (error) {
    console.warn(
      `[email] Unable to create email log: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}

async function updateEmailLog(
  logId: string | null,
  input: {
    errorMessage?: string | null;
    html?: string;
    provider?: string;
    status: "failed" | "sent" | "skipped";
  }
) {
  if (!logId) {
    return;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("email_logs")
      .update({
        body_html: input.html ?? null,
        error_message: input.errorMessage ?? null,
        provider: input.provider,
        sent_at: input.status === "sent" ? new Date().toISOString() : null,
        status: input.status,
      })
      .eq("id", logId);

    if (error) {
      console.warn(`[email] Unable to update email log ${logId}: ${error.message}`);
    }
  } catch (error) {
    console.warn(
      `[email] Unable to update email log ${logId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function sendTransactionalEmail(
  input: TransactionalEmailInput
): Promise<EmailDispatchResult> {
  const recipientEmail = input.recipientEmail.trim();
  const logHtml =
    input.logHtml === undefined ? input.html ?? null : input.logHtml;
  const logMetadata = input.logMetadata ?? input.metadata ?? {};
  const logText = input.logText ?? input.text;

  if (!recipientEmail) {
    return {
      delivered: false,
      fallback: true,
      logId: null,
      ok: true,
      provider: "log_only",
      reason: "missing_recipient_email",
      status: "skipped",
    };
  }

  if (input.skipDeliveryReason) {
    const logId = await createEmailLog({
      errorMessage: input.skipDeliveryReason,
      metadata: logMetadata,
      notificationId: input.notificationId ?? null,
      orderId: input.orderId ?? null,
      provider: "log_only",
      recipientEmail,
      status: "skipped",
      subject: input.subject,
      supportTicketId: input.supportTicketId ?? null,
      text: logText,
    });

    return {
      delivered: false,
      fallback: false,
      logId,
      ok: true,
      provider: "log_only",
      reason: input.skipDeliveryReason,
      status: "skipped",
    };
  }

  const smtpState = getSmtpState();
  const logId = await createEmailLog({
    errorMessage: smtpState.ready ? null : smtpState.reason,
    metadata: logMetadata,
    notificationId: input.notificationId ?? null,
    orderId: input.orderId ?? null,
    provider: smtpState.ready ? "smtp" : "log_only",
    recipientEmail,
    status: smtpState.ready ? "pending" : "skipped",
    subject: input.subject,
    supportTicketId: input.supportTicketId ?? null,
    text: logText,
  });

  if (!smtpState.ready) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email] Falling back to log-only delivery: ${smtpState.reason}`);
    }

    return {
      delivered: false,
      fallback: true,
      logId,
      ok: true,
      provider: "log_only",
      reason: smtpState.reason,
      status: "skipped",
    };
  }

  try {
    await sendViaSmtp(smtpState.config, {
      html: input.html,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      to: [recipientEmail],
    });

    await updateEmailLog(logId, {
      html: logHtml ?? undefined,
      provider: "smtp",
      status: "sent",
    });

    return {
      delivered: true,
      fallback: false,
      logId,
      ok: true,
      provider: "smtp",
      status: "sent",
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    await updateEmailLog(logId, {
      errorMessage: reason,
      html: logHtml ?? undefined,
      provider: "smtp",
      status: "failed",
    });

    return {
      delivered: false,
      fallback: false,
      logId,
      ok: false,
      provider: "smtp",
      reason,
      status: "failed",
    };
  }
}
