"use client";

import { ArrowLeft, ChevronRight, Mail, MessagesSquare, Power, Trash2, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  deleteWorkshopAction,
  replaceWorkshopManagerAction,
  resendManagerInviteAction,
  setWorkshopActiveAction,
  updateWorkshopDetailsAction,
} from "@/app/[locale]/admin/workshops/actions";
import { ManagerStatus } from "@/app/[locale]/admin/workshops/workshops-client";
import { useAdminConfirm } from "@/components/admin/AdminConfirm";
import { AdminActionPendingBar } from "@/components/admin/AdminActionPendingBar";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton, getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getAssignmentStatusMessageKey, getAssignmentStatusVariant } from "@/lib/admin/assignmentStatus";
import type { OrderListRecord } from "@/lib/db/orders";
import type { TeamMember } from "@/lib/db/workshopFlow";
import type { WorkshopRecord } from "@/lib/db/workshops";

type Props = { locale: AppLocale; openOrders: OrderListRecord[]; team: TeamMember[]; workshop: WorkshopRecord };
type Feedback = { message: string; tone: "success" | "error" } | null;

export function WorkshopDetailClient({ locale, openOrders, team, workshop }: Props) {
  const t = useTranslations("Admin.flow.workshops");
  const tc = useTranslations("Admin");
  const confirm = useAdminConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [details, setDetails] = useState({
    description: workshop.description ?? "",
    location: workshop.location,
    name: workshop.name,
    phone: workshop.phone,
  });
  const [changingManager, setChangingManager] = useState(!workshop.manager);
  const [manager, setManager] = useState({ managerEmail: "", managerName: "" });

  const run = (task: () => Promise<{ message: string; ok: boolean }>, after?: () => void) =>
    startTransition(async () => {
      const result = await task();
      setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) after?.();
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <AdminActionPendingBar active={pending} label={t("saving")} />
      <Link href="/admin/workshops" className={getAdminButtonClassName({ size: "sm", variant: "ghost" })}>
        <ArrowLeft className="rtl:rotate-180" />
        {tc("nav.workshops")}
      </Link>
      <AdminPageHeader
        title={workshop.name}
        meta={workshop.isActive ? <AdminBadge variant="success">{t("running")}</AdminBadge> : <AdminBadge>{t("paused")}</AdminBadge>}
        description={workshop.location || undefined}
        actions={
          <>
            <Link href={`/admin/messages?thread=management:${workshop.id}`} className={getAdminButtonClassName({ variant: "secondary" })}>
              <MessagesSquare />
              {t("messageManager")}
            </Link>
            <AdminButton
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => setWorkshopActiveAction(locale, workshop.id, !workshop.isActive))}
            >
              <Power />
              {workshop.isActive ? t("pause") : t("resume")}
            </AdminButton>
          </>
        }
      />

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.tone} role="status">
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <AdminCard title={t("manager")} description={t("managerCardHint")}>
            {workshop.manager ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{workshop.manager.name}</p>
                  <p className="text-sm text-muted">
                    <bdi>{workshop.manager.email}</bdi>
                  </p>
                </div>
                <ManagerStatus workshop={workshop} />
              </div>
            ) : (
              <p className="text-sm text-muted">{t("noManagerText")}</p>
            )}
            {workshop.manager ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {!workshop.manager.hasSignedIn ? (
                  <AdminButton size="sm" variant="secondary" disabled={pending} onClick={() => run(() => resendManagerInviteAction(locale, workshop.id))}>
                    <Mail />
                    {t("resendInvite")}
                  </AdminButton>
                ) : null}
                <AdminButton size="sm" variant="ghost" disabled={pending} onClick={() => setChangingManager((value) => !value)}>
                  <UserCog />
                  {t("changeManager")}
                </AdminButton>
              </div>
            ) : null}
            {changingManager ? (
              <form
                className="mt-4 grid gap-3 rounded-[0.8rem] border border-white/[0.06] bg-white/[0.02] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  run(
                    () => replaceWorkshopManagerAction(locale, workshop.id, manager),
                    () => {
                      setChangingManager(false);
                      setManager({ managerEmail: "", managerName: "" });
                    }
                  );
                }}
              >
                <p className="text-sm text-muted">{t("changeManagerHint")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AdminInput label={t("managerName")} required value={manager.managerName} onChange={(event) => setManager((current) => ({ ...current, managerName: event.target.value }))} />
                  <AdminInput label={t("managerEmail")} required type="email" dir="ltr" value={manager.managerEmail} onChange={(event) => setManager((current) => ({ ...current, managerEmail: event.target.value }))} />
                </div>
                <div>
                  <AdminButton type="submit" variant="primary" size="sm" disabled={pending || !manager.managerEmail.trim() || !manager.managerName.trim()}>
                    {t("sendManagerInvite")}
                  </AdminButton>
                </div>
              </form>
            ) : null}
          </AdminCard>

          <AdminCard title={t("openOrdersTitle")} description={t("openOrdersHint")} contentClassName="p-0">
            {openOrders.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">{t("noOpenOrders")}</p>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {openOrders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/admin/orders/${order.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.025]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          <bdi>{order.internalOrderNumber}</bdi> – {order.previewProductName || "–"}
                        </p>
                        <p className="truncate text-sm text-muted">{order.employeeName || t("notAssignedYet")}</p>
                      </div>
                      {order.employeeId ? (
                        <AdminBadge variant={getAssignmentStatusVariant(order.assignmentStatus)}>
                          {tc(getAssignmentStatusMessageKey(order.assignmentStatus))}
                        </AdminBadge>
                      ) : (
                        <AdminBadge variant="warning">{t("waitingForManager")}</AdminBadge>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          <AdminCard title={t("teamTitle")} description={t("teamHintOffice")} contentClassName="p-0">
            {team.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">{t("noTeam")}</p>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {team.map((member) => (
                  <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        {member.name}
                        {member.isManager ? <AdminBadge variant="gold">{t("managerBadge")}</AdminBadge> : null}
                        {!member.isActive ? <AdminBadge>{t("memberPaused")}</AdminBadge> : null}
                      </p>
                      <p className="text-sm text-muted">
                        <bdi>{member.email}</bdi>
                      </p>
                    </div>
                    <span className="text-sm text-muted">{t("openTasks", { count: member.openTasks })}</span>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title={t("detailsTitle")}>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                run(() => updateWorkshopDetailsAction(locale, { ...details, id: workshop.id }));
              }}
            >
              <AdminInput label={t("name")} required value={details.name} onChange={(event) => setDetails((current) => ({ ...current, name: event.target.value }))} />
              <AdminInput label={t("location")} value={details.location} onChange={(event) => setDetails((current) => ({ ...current, location: event.target.value }))} />
              <AdminInput label={t("phone")} type="tel" dir="ltr" value={details.phone} onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))} />
              <AdminTextarea label={t("notes")} value={details.description} onChange={(event) => setDetails((current) => ({ ...current, description: event.target.value }))} />
              <div>
                <AdminButton type="submit" variant="primary" disabled={pending || !details.name.trim()}>
                  {tc("buttons.save")}
                </AdminButton>
              </div>
            </form>
          </AdminCard>

          <AdminCard title={t("dangerTitle")} description={t("dangerHint")}>
            <AdminButton
              variant="danger"
              disabled={pending}
              onClick={async () => {
                const ok = await confirm({
                  confirmLabel: tc("buttons.delete"),
                  description: t("deleteText", { orders: workshop.activeOrders, team: workshop.employeeCount }),
                  title: t("deleteTitle", { name: workshop.name }),
                });
                if (!ok) return;
                startTransition(async () => {
                  // On success the server sends us back to the list.
                  const result = await deleteWorkshopAction(locale, workshop.id, true);
                  if (result && !result.ok) setFeedback({ message: result.message, tone: "error" });
                });
              }}
            >
              <Trash2 />
              {t("delete")}
            </AdminButton>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
