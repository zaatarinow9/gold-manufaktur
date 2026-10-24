"use client";

import clsx from "clsx";
import { Bell, Check, CheckCheck, ChevronRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  clearNotificationsAction,
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/[locale]/admin/notification-actions";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { useAdminConfirm } from "@/components/admin/AdminConfirm";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export type AdminNotificationItem = {
  id: string;
  isRead: boolean;
  isStale?: boolean;
  linkPath: string;
  message: string;
  time: string;
  title: string;
};

type Props = {
  locale: AppLocale;
  notifications: AdminNotificationItem[];
};

/** Notifications you can open, mark as read, delete or clear in one go. */
export function AdminNotificationsPanel({ locale, notifications }: Props) {
  const t = useTranslations("Admin.overview");
  const tc = useTranslations("Admin");
  const router = useRouter();
  const confirm = useAdminConfirm();
  const [pending, startTransition] = useTransition();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  const items = notifications.filter((item) => !hiddenIds.has(item.id));
  const unreadCount = items.filter((item) => !item.isRead && !readIds.has(item.id)).length;

  const run = (task: () => Promise<{ message: string; ok: boolean }>, optimistic?: () => void) => {
    setError(null);
    optimistic?.();
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.message);
      router.refresh();
    });
  };

  const markRead = (id: string) =>
    run(() => markNotificationReadAction(locale, id), () => setReadIds((current) => new Set(current).add(id)));

  const remove = (id: string) =>
    run(() => deleteNotificationAction(locale, id), () => setHiddenIds((current) => new Set(current).add(id)));

  return (
    <section className="admin-panel" aria-labelledby="notifications-title">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
        <h2 id="notifications-title" className="flex items-center gap-2 font-semibold text-foreground">
          {t("notificationsTitle")}
          {unreadCount > 0 ? <span className="admin-nav-count">{unreadCount}</span> : null}
        </h2>
        {items.length > 0 ? (
          <div className="ms-auto flex gap-1">
            {unreadCount > 0 ? (
              <button
                type="button"
                className="admin-button admin-button-ghost admin-button-sm"
                disabled={pending}
                onClick={() =>
                  run(
                    () => markAllNotificationsReadAction(locale),
                    () => setReadIds(new Set(items.map((item) => item.id)))
                  )
                }
              >
                <CheckCheck />
                {t("markAllRead")}
              </button>
            ) : null}
            <button
              type="button"
              className="admin-button admin-button-ghost admin-button-sm"
              disabled={pending}
              onClick={async () => {
                const confirmed = await confirm({
                  confirmLabel: t("clearAll"),
                  description: t("clearAllText"),
                  title: t("clearAllConfirm"),
                });
                if (confirmed) {
                  run(() => clearNotificationsAction(locale), () => setHiddenIds(new Set(items.map((item) => item.id))));
                }
              }}
            >
              <Trash2 />
              {t("clearAll")}
            </button>
          </div>
        ) : null}
      </header>

      {error ? (
        <p role="alert" className="border-b border-white/[0.06] px-5 py-2.5 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-6 text-sm text-muted">
          <Bell className="h-4 w-4" />
          {t("noNotifications")}
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {items.map((item) => {
            const unread = !item.isRead && !readIds.has(item.id);
            const body = (
              <>
                <span
                  aria-hidden="true"
                  className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", unread ? "bg-gold" : "bg-transparent")}
                />
                <span className="min-w-0 flex-1">
                  <span className={clsx("block text-sm text-foreground", unread && "font-semibold")}>{item.title}</span>
                  {item.message ? (
                    <span className="mt-0.5 line-clamp-2 block text-sm text-muted [overflow-wrap:anywhere]">{item.message}</span>
                  ) : null}
                  <span className="mt-1 block text-xs text-text-soft">
                    {item.time}
                    {item.isStale ? ` · ${t("notificationStale")}` : ""}
                  </span>
                </span>
              </>
            );

            return (
              <li key={item.id} className="flex items-start gap-1 pe-2">
                {item.linkPath ? (
                  <Link
                    href={item.linkPath}
                    onClick={() => {
                      if (unread) markRead(item.id);
                    }}
                    className="flex min-w-0 flex-1 items-start gap-2.5 px-5 py-3.5 transition hover:bg-white/[0.025]"
                  >
                    {body}
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted rtl:rotate-180" />
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 items-start gap-2.5 px-5 py-3.5">{body}</div>
                )}
                <div className="pt-2.5">
                  <AdminActionMenu
                    label={t("notificationActions", { title: item.title })}
                    items={[
                      ...(unread ? [{ icon: Check, label: t("markRead"), onSelect: () => markRead(item.id) }] : []),
                      { danger: true, icon: Trash2, label: tc("buttons.delete"), onSelect: () => remove(item.id) },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
