"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { workshops } from "@/data/adminMock";
import {
  getCurrentAdminUser,
  hasAdminRoleAccess,
  scopeWorkshopsForUser,
} from "@/lib/admin/currentUser";

export default function AdminWorkshopsPage() {
  const t = useTranslations("Admin");
  const currentUser = getCurrentAdminUser();
  const canAccess = hasAdminRoleAccess(currentUser, ["super_admin", "admin"]);
  const visibleWorkshops = scopeWorkshopsForUser(currentUser, workshops);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!canAccess) {
    return (
      <AdminCard title={t("common.noAccessTitle")} description={t("common.noAccessText")} />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("workshops.eyebrow")}
        title={t("workshops.title")}
        description={t("workshops.description")}
        actions={
          <AdminButton variant="primary" onClick={() => setFeedback(t("common.mockSubmit"))}>
            {t("buttons.addWorkshop")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        {visibleWorkshops.map((workshop) => (
          <AdminCard key={workshop.id} contentClassName="space-y-5 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{workshop.name}</h2>
                <p className="text-sm text-muted">{workshop.location}</p>
              </div>
              <AdminBadge variant={workshop.isActive ? "success" : "danger"}>
                {workshop.isActive ? t("common.active") : t("common.inactive")}
              </AdminBadge>
            </div>
            <div className="grid gap-3 rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4 text-sm text-muted">
              <div className="flex justify-between gap-4">
                <span>{t("workshops.cards.contact")}</span>
                <span className="text-foreground">{workshop.phone}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("workshops.cards.activeOrders")}</span>
                <span className="text-foreground">{workshop.activeOrders}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("workshops.cards.completed")}</span>
                <span className="text-foreground">{workshop.completedThisMonth}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("workshops.cards.performance")}</span>
                <span className="text-foreground">{`${workshop.onTimeRate}%`}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("workshops.cards.email")}</span>
                <span className="text-foreground">{workshop.email}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={() => setFeedback(t("common.mockSubmit"))}
              >
                {t("buttons.viewDetails")}
              </AdminButton>
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={() => setFeedback(t("common.mockSubmit"))}
              >
                {t("buttons.viewOrders")}
              </AdminButton>
            </div>
          </AdminCard>
        ))}
      </section>
    </div>
  );
}
