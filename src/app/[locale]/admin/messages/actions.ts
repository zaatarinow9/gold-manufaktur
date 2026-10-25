"use server";

import type { AppLocale } from "@/i18n/routing";
import { requireAdminAccess } from "@/lib/admin/auth";
import { runFlowAction } from "@/lib/admin/flowActions";
import { revalidateDashboard } from "@/lib/admin/revalidate";
import { markThreadRead, postMessage } from "@/lib/db/staffMessages";

export async function sendMessageAction(locale: AppLocale, input: { body: string; key: string; orderId?: string | null }) {
  return runFlowAction(locale, ["super_admin", "employee"], async (user) => {
    await postMessage(user, input);
    return "messageSent";
  });
}

export async function markThreadReadAction(locale: AppLocale, key: string) {
  const access = await requireAdminAccess(locale, ["super_admin", "employee"]);
  if (access.state !== "authenticated" || !access.user) return;
  try {
    await markThreadRead(access.user, key);
    revalidateDashboard();
  } catch {
    // Reading is best effort.
  }
}
