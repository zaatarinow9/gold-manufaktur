"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { routing, type AppLocale } from "@/i18n/routing";
import { getAdminSessionContext } from "@/lib/admin/auth";
import {
  clearAdminDecoySession,
  hasValidAdminDecoySession,
  setAdminDecoySession,
} from "@/lib/admin/decoyGateSession";
import {
  assertCanUseDecoyGate,
  disableAdminDecoyGate,
  disableAdminDecoyMode,
  enableAdminDecoyMode,
  getAdminDecoyControl,
  getAdminDecoyRecoveryEmail,
  isAdminDecoyConfigured,
  logAdminDecoyAudit,
  rotateAdminDecoyGate,
  updateAdminDecoyExpiry,
  validateAdminDecoyGateToken,
  verifyAdminDecoyPin,
  type AdminDecoyActor,
  type AdminDecoyControlRecord,
} from "@/lib/db/adminDecoy";
import { buildAdminSystemAccessEmail } from "@/lib/email/adminSystemAccessEmail";
import { sendTransactionalEmail } from "@/lib/email/service";
import { companyInfo } from "@/lib/site";

type SystemCheckActionResult = {
  control?: AdminDecoyControlRecord;
  emailSent?: boolean;
  emailTried?: boolean;
  link?: string;
  message: string;
  ok: boolean;
  refresh?: boolean;
};

type SystemCheckIntent =
  | "disable_gate"
  | "set_expiry"
  | "sync_off"
  | "sync_on"
  | "rotate";

type SystemCheckActionInput = {
  expiresAt?: string;
  intent: SystemCheckIntent;
};

function revalidateAdminViews() {
  const adminPaths = [
    "/admin",
    "/admin/archive",
    "/admin/attendance",
    "/admin/categories",
    "/admin/employees",
    "/admin/gallery",
    "/admin/gallery/new-order",
    "/admin/inquiries",
    "/admin/options",
    "/admin/orders",
    "/admin/products",
    "/admin/reports",
    "/admin/settings",
    "/admin/workshops",
  ];

  routing.locales.forEach((locale) => {
    adminPaths.forEach((path) => revalidatePath(`/${locale}${path}`));
  });
}

async function getActionCopy(locale: AppLocale) {
  return getTranslations({ locale, namespace: "Admin.systemCheck" });
}

function getAuditRecipientTarget(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  const atIndex = normalized.lastIndexOf("@");
  return atIndex === -1 ? normalized : normalized.slice(atIndex + 1);
}

async function getActor(user: { email: string; id: string }): Promise<AdminDecoyActor> {
  const requestHeaders = await headers();
  return {
    email: user.email,
    ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    source: "system-check",
    userAgent: requestHeaders.get("user-agent") ?? "",
    userId: user.id,
  };
}

async function getRequestBaseUrl() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    requestHeaders.get("host")?.trim() ??
    "";

  if (!host) {
    return "";
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";

  return `${protocol}://${host}`.replace(/\/+$/u, "");
}

async function requireSystemCheckAccess(
  locale: AppLocale,
  token: string,
  options?: { requireSession?: boolean }
) {
  const t = await getActionCopy(locale);
  const session = await getAdminSessionContext();

  if (session.state !== "authenticated" || !session.user) {
    return {
      message: t("unavailable"),
      ok: false as const,
    };
  }

  const actor = await getActor(session.user);

  try {
    assertCanUseDecoyGate(session.user);
  } catch {
    await logAdminDecoyAudit("decoy_gate_forbidden", actor, {
      reason: "forbidden",
    });
    return {
      message: t("unavailable"),
      ok: false as const,
    };
  }

  if (!isAdminDecoyConfigured()) {
    await logAdminDecoyAudit("decoy_gate_unavailable", actor, {
      reason: "env_missing",
    });
    return {
      message: t("unavailable"),
      ok: false as const,
    };
  }

  const tokenValid = await validateAdminDecoyGateToken(token, {
    touchLastUsed: options?.requireSession !== true,
  });

  if (!tokenValid) {
    await clearAdminDecoySession();
    await logAdminDecoyAudit("decoy_gate_unavailable", actor, {
      reason: "token_invalid",
    });
    return {
      message: t("unavailable"),
      ok: false as const,
    };
  }

  const control = await getAdminDecoyControl();

  if (
    options?.requireSession &&
    !(await hasValidAdminDecoySession({
      tokenHash: control.gateTokenHash,
      tokenVersion: control.tokenVersion,
      userId: session.user.id,
    }))
  ) {
    await logAdminDecoyAudit("decoy_gate_session_missing", actor, {
      tokenVersion: control.tokenVersion,
    });
    return {
      message: t("invalidSession"),
      ok: false as const,
    };
  }

  return {
    actor,
    control,
    ok: true as const,
    user: session.user,
  };
}

export async function unlockSystemCheckAction(
  locale: AppLocale,
  token: string,
  pin: string
): Promise<SystemCheckActionResult> {
  const t = await getActionCopy(locale);
  const access = await requireSystemCheckAccess(locale, token);

  if (!access.ok) {
    return access;
  }

  if (!verifyAdminDecoyPin(pin)) {
    await logAdminDecoyAudit("decoy_gate_pin_invalid", access.actor, {
      tokenVersion: access.control.tokenVersion,
    });
    return {
      message: t("pinInvalid"),
      ok: false,
    };
  }

  await setAdminDecoySession({
    tokenHash: access.control.gateTokenHash,
    tokenVersion: access.control.tokenVersion,
    userId: access.user.id,
  });
  await logAdminDecoyAudit("decoy_gate_pin_verified", access.actor, {
    tokenVersion: access.control.tokenVersion,
  });

  return {
    control: access.control,
    message: t("updated"),
    ok: true,
  };
}

export async function runSystemCheckAction(
  locale: AppLocale,
  token: string,
  input: SystemCheckActionInput
): Promise<SystemCheckActionResult> {
  const t = await getActionCopy(locale);
  const access = await requireSystemCheckAccess(locale, token, {
    requireSession: true,
  });

  if (!access.ok) {
    return access;
  }

  try {
    switch (input.intent) {
      case "sync_on": {
        const control = await enableAdminDecoyMode(access.actor);
        revalidateAdminViews();
        return {
          control,
          message: t("updated"),
          ok: true,
          refresh: true,
        };
      }
      case "sync_off": {
        const control = await disableAdminDecoyMode(access.actor);
        revalidateAdminViews();
        return {
          control,
          message: t("updated"),
          ok: true,
          refresh: true,
        };
      }
      case "set_expiry": {
        const control = await updateAdminDecoyExpiry(access.actor, input.expiresAt ?? "");
        revalidateAdminViews();
        return {
          control,
          message: t("updated"),
          ok: true,
          refresh: true,
        };
      }
      case "disable_gate": {
        const control = await disableAdminDecoyGate(access.actor);
        await clearAdminDecoySession();
        revalidateAdminViews();
        return {
          control,
          message: t("linkDisabled"),
          ok: true,
          refresh: false,
        };
      }
      case "rotate": {
        const baseUrl = await getRequestBaseUrl();
        const result = await rotateAdminDecoyGate(access.actor, {
          baseUrl,
          expiresAt: input.expiresAt ?? "",
          locale,
        });
        const recoveryEmail = getAdminDecoyRecoveryEmail();
        const auditRecipient = getAuditRecipientTarget(recoveryEmail);
        const email = buildAdminSystemAccessEmail({
          expiresAt: result.control.expiresAt,
          link: result.fullUrl,
        });
        const emailResult = await sendTransactionalEmail({
          html: email.html,
          logHtml: "<p>[redacted system access link]</p>",
          logMetadata: {
            emailKind: "admin_system_access_rotation",
            expiresAt: result.control.expiresAt || null,
            recipientTarget: auditRecipient || null,
            tokenVersion: result.control.tokenVersion,
          },
          logText: "[redacted system access link]",
          metadata: {
            emailKind: "admin_system_access_rotation",
            expiresAt: result.control.expiresAt || null,
            recipientTarget: auditRecipient || null,
            tokenVersion: result.control.tokenVersion,
          },
          recipientEmail: recoveryEmail,
          replyTo: companyInfo.emailDisplay,
          subject: email.subject,
          text: email.text,
        });
        const emailSent = emailResult.status === "sent";

        await logAdminDecoyAudit("gate_rotated", access.actor, {
          emailAttempted: true,
          emailSent,
          emailStatus: emailResult.status,
          expiresAt: result.control.expiresAt || null,
          locale,
          recipientTarget: auditRecipient || null,
          tokenVersion: result.control.tokenVersion,
        });
        await clearAdminDecoySession();
        revalidateAdminViews();
        return {
          control: result.control,
          emailSent,
          emailTried: true,
          link: result.fullUrl,
          message: t("newLinkCreated"),
          ok: true,
          refresh: false,
        };
      }
    }
  } catch (error) {
    await logAdminDecoyAudit("decoy_gate_action_failed", access.actor, {
      intent: input.intent,
      reason: error instanceof Error ? error.message : "unknown_error",
      tokenVersion: access.control.tokenVersion,
    });
  }

  return {
    message: t("mutationUnavailable"),
    ok: false,
  };
}
