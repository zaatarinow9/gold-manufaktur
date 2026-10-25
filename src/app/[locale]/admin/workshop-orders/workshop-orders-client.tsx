"use client";

import clsx from "clsx";
import { AlertTriangle, CalendarDays, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { assignOrderToEmployeeAction } from "@/app/[locale]/admin/orders/actions";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getAssignmentStatusMessageKey, getAssignmentStatusVariant } from "@/lib/admin/assignmentStatus";
import type { OrderListRecord } from "@/lib/db/orders";
import type { TeamMember } from "@/lib/db/workshopFlow";

type Tab = "toAssign" | "inProgress" | "finished";

function tabOf(order: OrderListRecord): Tab {
  if (!order.employeeId || order.assignmentStatus === "declined" || order.assignmentStatus === "returned") return "toAssign";
  if (order.assignmentStatus === "completed" || order.assignmentStatus === "shipped" || ["delivered", "cancelled"].includes(order.status)) {
    return "finished";
  }
  return "inProgress";
}

export function WorkshopOrdersClient({ locale, orders, team }: { locale: AppLocale; orders: OrderListRecord[]; team: TeamMember[] }) {
  const t = useTranslations("Admin.flow.workshopOrders");
  const tc = useTranslations("Admin");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>(() => (orders.some((order) => tabOf(order) === "toAssign") ? "toAssign" : "inProgress"));
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);

  const counts = { finished: 0, inProgress: 0, toAssign: 0 } as Record<Tab, number>;
  orders.forEach((order) => (counts[tabOf(order)] += 1));
  const visible = orders
    .filter((order) => tabOf(order) === tab)
    .sort((left, right) => (left.dueDate || "9999").localeCompare(right.dueDate || "9999"));

  const assign = (order: OrderListRecord) => {
    const employeeId = chosen[order.id];
    if (!employeeId) return;
    startTransition(async () => {
      const result = await assignOrderToEmployeeAction(locale, { assignmentNote: "", employeeId, orderId: order.id });
      setFeedback({ message: result.message, ok: result.ok });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("title")} description={t("description")} />

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.ok ? "success" : "error"} role="status">
          {feedback.message}
        </div>
      ) : null}

      <div role="tablist" aria-label={t("title")} className="flex flex-wrap gap-2">
        {(["toAssign", "inProgress", "finished"] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className="admin-chip"
          >
            {t(`tabs.${key}`)}
            <span className="tabular-nums opacity-70">{counts[key]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <AdminEmptyState title={t(`empty.${tab}`)} />
      ) : (
        <ul className="space-y-3" aria-busy={pending || undefined}>
          {visible.map((order) => {
            const needsAttention = order.assignmentStatus === "problem" || order.assignmentStatus === "declined";
            return (
              <li key={order.id} className={clsx("admin-panel p-4", needsAttention && "border-rose-400/30")}>
                <div className="flex flex-wrap items-start gap-3">
                  <Link href={`/admin/orders/${order.id}`} className="min-w-0 flex-1">
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
                      {order.employeeName ? <span>{order.employeeName}</span> : null}
                    </p>
                  </Link>
                  {order.employeeId ? (
                    <AdminBadge variant={getAssignmentStatusVariant(order.assignmentStatus)}>
                      {needsAttention ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
                      {tc(getAssignmentStatusMessageKey(order.assignmentStatus))}
                    </AdminBadge>
                  ) : (
                    <AdminBadge variant="gold">{t("new")}</AdminBadge>
                  )}
                </div>
                {order.employeeNote && needsAttention ? (
                  <p className="mt-3 rounded-[0.6rem] bg-rose-400/[0.08] px-3 py-2 text-sm text-rose-100">{order.employeeNote}</p>
                ) : null}
                {tab !== "finished" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      aria-label={t("assignTo")}
                      className="admin-select min-w-0 flex-1 sm:max-w-xs"
                      value={chosen[order.id] ?? ""}
                      disabled={pending || team.length === 0}
                      onChange={(event) => setChosen((current) => ({ ...current, [order.id]: event.target.value }))}
                    >
                      <option value="">{team.length === 0 ? t("noTeam") : order.employeeId ? t("reassignTo") : t("assignTo")}</option>
                      {team.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} {t("taskCount", { count: member.openTasks })}
                        </option>
                      ))}
                    </select>
                    <AdminButton size="sm" variant="primary" disabled={pending || !chosen[order.id]} onClick={() => assign(order)}>
                      {t("assign")}
                    </AdminButton>
                    <Link href={`/admin/orders/${order.id}`} className="admin-button admin-button-ghost admin-button-sm ms-auto">
                      {t("details")}
                      <ChevronRight className="rtl:rotate-180" />
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
