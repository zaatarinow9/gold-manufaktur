import "server-only";

import { getTranslations } from "next-intl/server";
import { ZodError } from "zod";

import type { AppLocale } from "@/i18n/routing";
import { requireAdminAccess } from "@/lib/admin/auth";
import { revalidateDashboard } from "@/lib/admin/revalidate";
import { getAdminDecoyUnavailableMessage, isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import type { AdminRole, AdminUser } from "@/types/admin";

export type FlowResult = { message: string; ok: boolean };

const knownErrors = new Set([
  "CANNOT_CHANGE_SELF",
  "EMAIL_IN_USE",
  "EMAIL_IS_OFFICE_ACCOUNT",
  "INVALID",
  "MESSAGE_EMPTY",
  "MESSAGE_TOO_LONG",
  "ORDER_NOT_FOUND",
  "PERMISSION_DENIED",
  "TASK_NOTE_REQUIRED",
  "THREAD_NOT_FOUND",
  "WORKSHOP_HAS_NO_MANAGER",
  "WORKSHOP_INACTIVE",
  "WORKSHOP_NOT_FOUND",
]);

export async function flowErrorMessage(locale: AppLocale, error: unknown) {
  const t = await getTranslations({ locale, namespace: "Admin.flow.errors" });
  if (error instanceof ZodError) return t("INVALID");
  const code = error instanceof Error ? error.message : "";
  if (knownErrors.has(code)) return t(code);
  console.error("[workshop-flow]", error);
  return t("FAILED");
}

/**
 * Runs a dashboard mutation: checks the session, blocks the demo mode,
 * turns known error codes into readable text and refreshes the dashboard.
 * `task` returns the success message key under "Admin.flow.done".
 */
export async function runFlowAction(
  locale: AppLocale,
  roles: AdminRole[],
  task: (user: AdminUser) => Promise<string | { key: string; values?: Record<string, string> }>
): Promise<FlowResult> {
  const access = await requireAdminAccess(locale, roles);
  if (access.state !== "authenticated" || !access.user) {
    return { message: await flowErrorMessage(locale, new Error("PERMISSION_DENIED")), ok: false };
  }
  if (await isAdminDecoyEnabled()) return { message: getAdminDecoyUnavailableMessage(locale), ok: false };

  try {
    const outcome = await task(access.user);
    revalidateDashboard();
    const t = await getTranslations({ locale, namespace: "Admin.flow.done" });
    const { key, values } = typeof outcome === "string" ? { key: outcome, values: undefined } : outcome;
    return { message: t(key, values), ok: true };
  } catch (error) {
    return { message: await flowErrorMessage(locale, error), ok: false };
  }
}

/** "sent" → normal success key; anything else → the "...NoEmail" variant. */
export function withEmailOutcome(key: string, emailStatus: string | null | undefined) {
  return emailStatus === "sent" ? key : `${key}NoEmail`;
}
