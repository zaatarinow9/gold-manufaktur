"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { routing, type AppLocale } from "@/i18n/routing";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getAdminDecoyUnavailableMessage, isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import { deleteAdminNotifications, markAdminNotificationsRead } from "@/lib/db/notifications";

type NotificationActionResult = { message: string; ok: boolean };

async function runNotificationAction(
  locale: AppLocale,
  task: (viewer: NonNullable<Awaited<ReturnType<typeof requireAdminAccess>>["user"]>) => Promise<unknown>,
  successKey: "cleared" | "deleted" | "markedRead"
): Promise<NotificationActionResult> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin", "admin", "employee", "marketing", "customer_service"]);
  if (access.state !== "authenticated" || !access.user) return { message: t("common.noAccessText"), ok: false };
  if (await isAdminDecoyEnabled()) return { message: getAdminDecoyUnavailableMessage(locale), ok: false };

  try {
    await task(access.user);
    for (const routeLocale of routing.locales) revalidatePath(`/${routeLocale}/admin`, "layout");
    return { message: t(`overview.notificationsMessages.${successKey}`), ok: true };
  } catch {
    return { message: t("overview.notificationsMessages.failed"), ok: false };
  }
}

export async function markNotificationReadAction(locale: AppLocale, id: string) {
  return runNotificationAction(locale, (viewer) => markAdminNotificationsRead(viewer, [id]), "markedRead");
}

export async function markAllNotificationsReadAction(locale: AppLocale) {
  return runNotificationAction(locale, (viewer) => markAdminNotificationsRead(viewer), "markedRead");
}

export async function deleteNotificationAction(locale: AppLocale, id: string) {
  return runNotificationAction(locale, (viewer) => deleteAdminNotifications(viewer, [id]), "deleted");
}

export async function clearNotificationsAction(locale: AppLocale) {
  return runNotificationAction(locale, (viewer) => deleteAdminNotifications(viewer), "cleared");
}
