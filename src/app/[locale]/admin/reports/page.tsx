"use client";

import { useTranslations } from "next-intl";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { reportsSummary } from "@/data/adminMock";
import { getCurrentAdminUser, hasAdminRoleAccess } from "@/lib/admin/currentUser";

export default function AdminReportsPage() {
  const t = useTranslations("Admin");
  const currentUser = getCurrentAdminUser();

  if (!hasAdminRoleAccess(currentUser, ["super_admin", "admin"])) {
    return (
      <AdminCard title={t("common.noAccessTitle")} description={t("common.noAccessText")} />
    );
  }

  const maxStatus = Math.max(...reportsSummary.ordersByStatus.map((item) => item.total), 1);
  const maxWorkshop = Math.max(...reportsSummary.ordersByWorkshop.map((item) => item.total), 1);
  const maxOption = Math.max(...reportsSummary.optionUsage.map((item) => item.total), 1);
  const maxWorkload = Math.max(...reportsSummary.workload.map((item) => item.activeOrders), 1);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("reports.eyebrow")}
        title={t("reports.title")}
        description={t("reports.description")}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label={t("reports.cards.productionTime")}
          value={reportsSummary.productionTimeAverageDays}
        />
        <AdminStatCard label={t("reports.cards.ready")} value={reportsSummary.readyOrders} />
        <AdminStatCard
          label={t("reports.cards.delivered")}
          value={reportsSummary.deliveredOrders}
        />
        <AdminStatCard
          label={t("reports.cards.activeWorkshops")}
          value={reportsSummary.ordersByWorkshop.length}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminCard title={t("reports.statusTitle")} description={t("reports.statusDescription")}>
          <div className="space-y-3">
            {reportsSummary.ordersByStatus.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{t(`status.${item.status}`)}</p>
                  <p className="text-sm text-muted">{item.total}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(232,201,135,0.95),rgba(196,154,82,0.6))]"
                    style={{ width: `${(item.total / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title={t("reports.workshopsTitle")} description={t("reports.workshopsDescription")}>
          <div className="space-y-3">
            {reportsSummary.ordersByWorkshop.map((item) => (
              <div key={item.workshopId} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.workshopName}</p>
                  <p className="text-sm text-muted">{item.total}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(196,154,82,0.95),rgba(122,92,45,0.7))]"
                    style={{ width: `${(item.total / maxWorkshop) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title={t("reports.optionsTitle")} description={t("reports.optionsDescription")}>
          <div className="space-y-3">
            {reportsSummary.optionUsage.slice(0, 6).map((item) => (
              <div key={item.optionId} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.optionLabel}</p>
                  <p className="text-sm text-muted">{item.total}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(232,201,135,0.95),rgba(96,165,250,0.55))]"
                    style={{ width: `${(item.total / maxOption) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title={t("reports.workloadTitle")} description={t("reports.workloadDescription")}>
          <div className="space-y-3">
            {reportsSummary.workload.map((item) => (
              <div
                key={item.employeeId}
                className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{item.employeeName}</p>
                  <AdminBadge variant="info">{`${item.completionRate}%`}</AdminBadge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(232,201,135,0.95),rgba(16,185,129,0.55))]"
                    style={{ width: `${(item.activeOrders / maxWorkload) * 100}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-muted">
                  {t("reports.activeOrdersCount", { count: item.activeOrders })}
                </p>
              </div>
            ))}
          </div>
        </AdminCard>
      </section>
    </div>
  );
}
