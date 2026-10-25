"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type { AppLocale } from "@/i18n/routing";
import type { StaffMessage, ThreadChannel } from "@/lib/db/staffMessages";

import { AdminCard } from "./AdminCard";
import { MessageThread } from "./MessageThread";

export type OrderThread = {
  channel: ThreadChannel;
  key: string;
  messages: StaffMessage[];
  /** Who you talk to, e.g. the manager's or employee's name. */
  withName: string;
};

/** Messages about this order, one tab per conversation partner. */
export function OrderConversation({ locale, orderId, threads }: { locale: AppLocale; orderId: string; threads: OrderThread[] }) {
  const t = useTranslations("Admin.flow.messages");
  const [active, setActive] = useState(threads[0]?.key ?? "");
  const thread = threads.find((item) => item.key === active) ?? threads[0];
  if (!thread) return null;

  const label = (item: OrderThread) =>
    item.channel === "management" ? t("withOffice") : t("withPerson", { name: item.withName || "–" });

  return (
    <AdminCard title={t("orderTitle")} description={t("orderHint")}>
      {threads.length > 1 ? (
        <div role="tablist" aria-label={t("orderTitle")} className="mb-3 flex flex-wrap gap-2">
          {threads.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={item.key === thread.key}
              className="admin-chip"
              onClick={() => setActive(item.key)}
            >
              {label(item)}
            </button>
          ))}
        </div>
      ) : (
        <p className="mb-2 text-xs text-muted">{label(thread)}</p>
      )}
      <MessageThread
        key={thread.key}
        className="max-h-[28rem]"
        emptyText={t("orderEmpty")}
        locale={locale}
        messages={thread.messages}
        orderId={orderId}
        placeholder={t("placeholder")}
        threadKey={thread.key}
      />
    </AdminCard>
  );
}
