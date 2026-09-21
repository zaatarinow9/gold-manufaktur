"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { assignOrderToEmployeeAction } from "@/app/[locale]/admin/orders/actions";
import { AdminActionPendingBar } from "@/components/admin/AdminActionPendingBar";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { OrderListRecord } from "@/lib/db/orders";

type Props = {
  employees: Array<{ full_name: string; id: string; is_active: boolean; workshop_id: string | null }>;
  locale: AppLocale;
  orders: OrderListRecord[];
};

function copy(locale: AppLocale) {
  return locale === "ar"
    ? { assign: "إسناد إلى موظف", empty: "لا توجد طلبات لهذه الورشة.", pending: "جارٍ حفظ الإسناد…", title: "طلبات الورشة", unassigned: "غير مسند" }
    : { assign: "Mitarbeiter zuweisen", empty: "Für diese Werkstatt liegen keine Aufträge vor.", pending: "Zuweisung wird gespeichert…", title: "Werkstattaufträge", unassigned: "Nicht zugewiesen" };
}

export function WorkshopOrdersClient({ employees, locale, orders }: Props) {
  const text = copy(locale);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  return <div className="space-y-6">
    <AdminActionPendingBar active={pending} label={text.pending} />
    <AdminPageHeader eyebrow={text.title} title={text.title} description={text.title} />
    {feedback ? <p className="rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm">{feedback}</p> : null}
    {orders.length === 0 ? <AdminCard><p className="text-sm text-muted">{text.empty}</p></AdminCard> : null}
    <div className="grid gap-4 xl:grid-cols-2">
      {orders.map((order) => <AdminCard key={order.id} title={order.internalOrderNumber || order.trackingNumber}>
        <div className="space-y-3 text-sm">
          <p className="text-muted">{order.previewProductName || "—"}</p>
          <p>{order.employeeName || text.unassigned}</p>
          <div className="flex flex-wrap gap-2">
            <select aria-label={text.assign} value={chosen[order.id] ?? order.employeeId ?? ""} onChange={(event) => setChosen((current) => ({ ...current, [order.id]: event.target.value }))} disabled={pending} className="min-w-48 rounded-lg border border-white/15 bg-surface px-3 py-2">
              <option value="">{text.assign}</option>
              {employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.full_name}</option>)}
            </select>
            <AdminButton disabled={pending || !(chosen[order.id] ?? order.employeeId)} onClick={() => startTransition(async () => {
              const employeeId = chosen[order.id] ?? order.employeeId;
              if (!employeeId) return;
              const result = await assignOrderToEmployeeAction(locale, { assignmentNote: "", employeeId, orderId: order.id });
              setFeedback(result.message);
              if (result.ok) router.refresh();
            })}>{text.assign}</AdminButton>
            <Link href={`/admin/orders/${order.id}`} className="rounded-lg border border-white/15 px-3 py-2">→</Link>
          </div>
        </div>
      </AdminCard>)}
    </div>
  </div>;
}
