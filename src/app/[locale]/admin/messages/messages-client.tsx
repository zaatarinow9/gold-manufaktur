"use client";

import clsx from "clsx";
import { MessagesSquare } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect } from "react";

import { markThreadReadAction } from "@/app/[locale]/admin/messages/actions";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MessageThread } from "@/components/admin/MessageThread";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { StaffMessage, ThreadSummary } from "@/lib/db/staffMessages";

type Props = {
  activeKey: string;
  locale: AppLocale;
  messages: StaffMessage[];
  threads: ThreadSummary[];
  viewerKind: "admin" | "manager" | "employee";
};

export function MessagesClient({ activeKey, locale, messages, threads, viewerKind }: Props) {
  const t = useTranslations("Admin.flow.messages");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const active = threads.find((thread) => thread.key === activeKey);
  const unreadInActive = active?.unread ?? 0;

  useEffect(() => {
    if (activeKey && unreadInActive > 0) void markThreadReadAction(locale, activeKey);
  }, [activeKey, locale, unreadInActive]);

  const titleOf = (thread: ThreadSummary) => {
    if (thread.channel === "management") return viewerKind === "admin" ? thread.workshopName : t("office");
    return thread.title || "–";
  };
  const subtitleOf = (thread: ThreadSummary) => {
    if (thread.channel === "management") return viewerKind === "admin" ? thread.title : t("officeHint");
    return viewerKind === "manager" ? t("teamMember") : t("yourManager");
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("title")} description={t(`description.${viewerKind}`)} />

      {threads.length === 0 ? (
        <AdminEmptyState title={t("noThreads")} description={t(`noThreadsText.${viewerKind}`)} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <nav aria-label={t("title")} className="admin-panel min-w-0 p-1.5">
            <ul className="space-y-0.5">
              {threads.map((thread) => (
                <li key={thread.key}>
                  <Link
                    href={`/admin/messages?thread=${encodeURIComponent(thread.key)}`}
                    aria-current={thread.key === activeKey ? "page" : undefined}
                    className={clsx(
                      "flex items-start gap-2.5 rounded-[0.6rem] px-3 py-2.5 transition",
                      thread.key === activeKey ? "bg-gold/[0.1]" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={clsx("truncate text-sm text-foreground", thread.unread > 0 && "font-semibold")}>{titleOf(thread)}</span>
                        {thread.unread > 0 ? <span className="admin-nav-count ms-auto">{thread.unread}</span> : null}
                      </span>
                      <span dir="auto" className="block truncate text-start text-xs text-muted">{thread.lastPreview || subtitleOf(thread)}</span>
                      {thread.lastAt ? (
                        <span className="block text-[0.7rem] text-text-soft">{format.relativeTime(new Date(thread.lastAt), now)}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {active ? (
            <section className="admin-panel flex min-h-[28rem] min-w-0 flex-col p-4" aria-labelledby="thread-title">
              <header className="mb-2 border-b border-white/[0.06] pb-3">
                <h2 id="thread-title" className="font-semibold text-foreground">
                  {titleOf(active)}
                </h2>
                <p className="text-sm text-muted">{subtitleOf(active)}</p>
              </header>
              <MessageThread
                key={active.key}
                className="max-h-[60vh] flex-1"
                emptyText={t("threadEmpty")}
                locale={locale}
                messages={messages}
                placeholder={t("placeholder")}
                threadKey={active.key}
              />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
