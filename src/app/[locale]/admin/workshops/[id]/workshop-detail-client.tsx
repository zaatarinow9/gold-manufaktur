"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { toggleWorkshopActiveAction } from "@/app/[locale]/admin/workshops/actions";
import { AdminActionPendingBar } from "@/components/admin/AdminActionPendingBar";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { AppLocale } from "@/i18n/routing";
import type { WorkshopRecord } from "@/lib/db/workshops";

type Props = { locale: AppLocale; workshop: WorkshopRecord };
export function WorkshopDetailClient({ locale, workshop }: Props) {
  const ar = locale === "ar";
  const text = ar ? { title: "معلومات الورشة", manager: "مدير الورشة", employees: "الموظفون", orders: "الطلبات الحالية", deactivate: "تعطيل الورشة", active: "نشطة", inactive: "معطلة", count: "عدد الموظفين", current: "الطلبات الحالية", pending: "جارٍ الحفظ…" } : { title: "Werkstattinformationen", manager: "Werkstattleitung", employees: "Mitarbeiter", orders: "Aktuelle Aufträge", deactivate: "Werkstatt deaktivieren", active: "Aktiv", inactive: "Deaktiviert", count: "Mitarbeiterzahl", current: "Aktuelle Aufträge", pending: "Wird gespeichert…" };
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [feedback, setFeedback] = useState<string | null>(null);
  return <div className="space-y-6"><AdminActionPendingBar active={pending} label={text.pending} /><AdminPageHeader eyebrow={text.title} title={workshop.name} description={workshop.description || workshop.location} />{feedback ? <p className="rounded-xl border border-gold/20 bg-gold/10 p-3 text-sm">{feedback}</p> : null}<AdminCard title={text.title}><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted">{text.count}</dt><dd>{workshop.employeeCount}</dd></div><div><dt className="text-muted">{text.current}</dt><dd>{workshop.activeOrders}</dd></div><div><dt className="text-muted">{text.manager}</dt><dd>{workshop.contactName || "—"}</dd></div><div><dt className="text-muted">{text.orders}</dt><dd>{workshop.isActive ? text.active : text.inactive}</dd></div></dl></AdminCard><AdminCard title={text.manager}><p className="text-sm text-muted">{workshop.contactName || "—"}</p></AdminCard><AdminCard title={text.employees}><p className="text-sm text-muted">{workshop.employeeCount}</p></AdminCard><AdminCard title={text.orders}><p className="text-sm text-muted">{workshop.activeOrders}</p></AdminCard>{workshop.isActive ? <AdminButton variant="danger" disabled={pending} onClick={() => startTransition(async () => { const result = await toggleWorkshopActiveAction(locale, workshop.id, false); setFeedback(result.message); if (result.ok) router.refresh(); })}>{text.deactivate}</AdminButton> : null}</div>;
}
