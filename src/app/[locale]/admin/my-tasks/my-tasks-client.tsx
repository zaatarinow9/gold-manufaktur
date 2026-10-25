"use client";

import clsx from "clsx";
import { CalendarDays, ChevronRight, MessagesSquare } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Link } from "@/i18n/navigation";
import { getAssignmentStatusMessageKey, getAssignmentStatusVariant } from "@/lib/admin/assignmentStatus";
import type { OrderListRecord } from "@/lib/db/orders";

const finished = new Set(["completed", "shipped", "declined", "returned"]);

export function AdminMyTasksClient({ orders }: { orders: OrderListRecord[] }) {
  const t = useTranslations("Admin.flow.myTasks");
  const tc = useTranslations("Admin");
  const format = useFormatter();
  const [tab, setTab] = useState<"current" | "done">("current");
  const current = orders.filter((order) => !finished.has(order.assignmentStatus));
  const done = orders.filter((order) => finished.has(order.assignmentStatus));
  const visible = (tab === "current" ? current : done).sort((left, right) =>
    (left.dueDate || "9999").localeCompare(right.dueDate || "9999")
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href="/admin/messages" className={getAdminButtonClassName({ variant: "secondary" })}>
            <MessagesSquare />
            {t("writeManager")}
          </Link>
        }
      />

      <div role="tablist" aria-label={t("title")} className="flex flex-wrap gap-2">
        <button type="button" role="tab" aria-selected={tab === "current"} className="admin-chip" onClick={() => setTab("current")}>
          {t("current")} <span className="tabular-nums opacity-70">{current.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "done"} className="admin-chip" onClick={() => setTab("done")}>
          {t("done")} <span className="tabular-nums opacity-70">{done.length}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <AdminEmptyState title={tab === "current" ? t("emptyCurrent") : t("emptyDone")} description={tab === "current" ? t("emptyCurrentText") : undefined} />
      ) : (
        <ul className="space-y-3">
          {visible.map((order) => {
            const isNew = order.assignmentStatus === "assigned";
            return (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className={clsx("admin-panel flex items-center gap-3 p-4 transition hover:border-gold/30", isNew && "border-gold/30")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      <bdi>{order.internalOrderNumber}</bdi> – {order.previewProductName || "–"}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      {order.dueDate ? (
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {t("due", { date: format.dateTime(new Date(order.dueDate), { dateStyle: "medium" }) })}
                        </span>
                      ) : null}
                      {order.priority !== "normal" ? <AdminBadge variant="warning">{tc(`priority.${order.priority}`)}</AdminBadge> : null}
                    </p>
                    {order.assignmentNote ? <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{order.assignmentNote}</p> : null}
                  </div>
                  <AdminBadge variant={isNew ? "gold" : getAssignmentStatusVariant(order.assignmentStatus)}>
                    {isNew ? t("newTask") : tc(getAssignmentStatusMessageKey(order.assignmentStatus))}
                  </AdminBadge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
