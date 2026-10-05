"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { toggleWorkshopActiveAction } from "@/app/[locale]/admin/workshops/actions";
import { AdminActionPendingBar } from "@/components/admin/AdminActionPendingBar";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { AppLocale } from "@/i18n/routing";
import type { WorkshopRecord } from "@/lib/db/workshops";

type Props = { locale: AppLocale; workshop: WorkshopRecord };

export function WorkshopDetailClient({ locale, workshop }: Props) {
  const t = useTranslations("Admin.workshops.detail");
  const common = useTranslations("Admin.common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  return <div className="space-y-6">
    <AdminActionPendingBar active={pending} label={t("pending")} />
    <AdminPageHeader eyebrow={t("title")} title={workshop.name} description={workshop.description || workshop.location} />
    {feedback ? <p className="rounded-xl border border-gold/20 bg-gold/10 p-3 text-sm">{feedback}</p> : null}
    <AdminCard title={t("title")}><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted">{t("employeeCount")}</dt><dd>{workshop.employeeCount}</dd></div><div><dt className="text-muted">{t("orders")}</dt><dd>{workshop.activeOrders}</dd></div><div><dt className="text-muted">{t("manager")}</dt><dd>{workshop.contactName || "—"}</dd></div><div><dt className="text-muted">{t("orders")}</dt><dd>{workshop.isActive ? common("active") : common("inactive")}</dd></div></dl></AdminCard>
    <AdminCard title={t("manager")}><p className="text-sm text-muted">{workshop.contactName || "—"}</p></AdminCard>
    <AdminCard title={t("employees")}><p className="text-sm text-muted">{workshop.employeeCount}</p></AdminCard>
    <AdminCard title={t("orders")}><p className="text-sm text-muted">{workshop.activeOrders}</p></AdminCard>
    {workshop.isActive ? <AdminButton variant="danger" disabled={pending} onClick={() => startTransition(async () => { const result = await toggleWorkshopActiveAction(locale, workshop.id, false); setFeedback(result.message); if (result.ok) router.refresh(); })}>{t("deactivate")}</AdminButton> : null}
  </div>;
}
