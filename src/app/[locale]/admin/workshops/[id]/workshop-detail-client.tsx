"use client";

import { ArrowLeft, Mail, Power, Trash2, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  assignWorkshopManagerAction,
  permanentlyDeleteWorkshopAction,
  sendWorkshopManagerInviteAction,
  toggleWorkshopActiveAction,
} from "@/app/[locale]/admin/workshops/actions";
import { useAdminConfirm } from "@/components/admin/AdminConfirm";
import { AdminActionPendingBar } from "@/components/admin/AdminActionPendingBar";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton, getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { EmployeeAccountRecord } from "@/lib/db/employeeAccounts";
import type { WorkshopRecord } from "@/lib/db/workshops";

type Props = { employees: EmployeeAccountRecord[]; locale: AppLocale; workshop: WorkshopRecord };

export function WorkshopDetailClient({ employees, locale, workshop }: Props) {
  const t = useTranslations("Admin.workshops.detail");
  const tc = useTranslations("Admin");
  const confirm = useAdminConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const run = (task: () => Promise<{ message: string; ok: boolean }>, afterSuccess?: () => void) => {
    startTransition(async () => {
      const result = await task();
      setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) {
        if (afterSuccess) afterSuccess();
        else router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <AdminActionPendingBar active={pending} label={t("pending")} />
      <Link href="/admin/workshops" className={getAdminButtonClassName({ size: "sm", variant: "ghost" })}>
        <ArrowLeft className="rtl:rotate-180" />
        {tc("nav.workshops")}
      </Link>
      <AdminPageHeader
        title={workshop.name}
        meta={
          <AdminBadge variant={workshop.isActive ? "success" : "neutral"}>
            {workshop.isActive ? tc("common.active") : tc("common.inactive")}
          </AdminBadge>
        }
        description={workshop.description || workshop.location || undefined}
        actions={
          <AdminButton
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => toggleWorkshopActiveAction(locale, workshop.id, !workshop.isActive))}
          >
            <Power />
            {workshop.isActive ? t("deactivate") : t("activate")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.tone} role="status">{feedback.message}</div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AdminStatCard label={t("employeeCount")} value={workshop.employeeCount} />
        <AdminStatCard label={t("orders")} value={workshop.activeOrders} />
        <AdminStatCard className="col-span-2 lg:col-span-1" label={t("manager")} value={workshop.contactName || "–"} />
      </section>

      <AdminCard title={t("employees")} description={t("employeesHint")} contentClassName="p-0">
        {employees.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">{t("noEmployees")}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {employees.map((employee) => {
              const isManager = Boolean(workshop.contactName) && employee.fullName === workshop.contactName;
              return (
                <li key={employee.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                      {employee.fullName}
                      {isManager ? <AdminBadge variant="gold">{t("managerBadge")}</AdminBadge> : null}
                    </p>
                    <p className="text-sm text-muted">
                      <bdi>{employee.email || "–"}</bdi> · {t(`account.${employee.accountStatus}`)}
                    </p>
                  </div>
                  {isManager ? null : employee.accountStatus === "active" ? (
                    <AdminButton
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() => assignWorkshopManagerAction(locale, { employeeId: employee.id, workshopId: workshop.id }))
                      }
                    >
                      <UserCheck />
                      {t("appointManager")}
                    </AdminButton>
                  ) : (
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => run(() => sendWorkshopManagerInviteAction(locale, employee.id))}
                    >
                      <Mail />
                      {employee.accountStatus === "invited" ? t("resendInvite") : t("sendInvite")}
                    </AdminButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>

      <AdminCard title={t("dangerTitle")} description={t("dangerHint")}>
        <AdminButton
          variant="danger"
          disabled={pending}
          onClick={async () => {
            if (await confirm({ title: t("deleteConfirm", { name: workshop.name }), description: t("dangerHint") })) {
              run(
                () => permanentlyDeleteWorkshopAction(locale, workshop.id),
                () => router.push(`/${locale}/admin/workshops`)
              );
            }
          }}
        >
          <Trash2 />
          {t("deleteWorkshop")}
        </AdminButton>
      </AdminCard>
    </div>
  );
}
