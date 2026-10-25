"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { assignOrderToEmployeeAction, sendOrderToWorkshopAction } from "@/app/[locale]/admin/orders/actions";
import type { AppLocale } from "@/i18n/routing";
import { getAssignmentStatusMessageKey, getAssignmentStatusVariant } from "@/lib/admin/assignmentStatus";
import type { OrderAssignmentStatus } from "@/types/admin";

import { AdminBadge } from "./AdminBadge";
import { AdminButton } from "./AdminButton";
import { AdminCard } from "./AdminCard";
import { AdminSelect } from "./AdminSelect";
import { AdminTextarea } from "./AdminTextarea";

type Assignment = {
  assignmentStatus: OrderAssignmentStatus;
  employeeId: string | null;
  employeeName: string;
  employeeNote: string;
};

function ProgressRows({ assignment }: { assignment: Assignment }) {
  const t = useTranslations("Admin.flow.orderCard");
  const tc = useTranslations("Admin");
  return (
    <dl className="grid gap-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-muted">{t("craftsman")}</dt>
        <dd className="text-end text-foreground">{assignment.employeeName || t("notAssigned")}</dd>
      </div>
      {assignment.employeeId ? (
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">{t("progress")}</dt>
          <dd>
            <AdminBadge variant={getAssignmentStatusVariant(assignment.assignmentStatus)}>
              {tc(getAssignmentStatusMessageKey(assignment.assignmentStatus))}
            </AdminBadge>
          </dd>
        </div>
      ) : null}
      {assignment.employeeNote ? (
        <div className="rounded-[0.7rem] border border-white/[0.07] bg-white/[0.03] px-3 py-2">
          <dt className="text-xs text-muted">{t("craftsmanNote")}</dt>
          <dd className="mt-0.5 whitespace-pre-line text-foreground">{assignment.employeeNote}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/** Head office: which workshop makes this piece, and how far it is. */
export function OrderWorkshopCard({
  assignment,
  locale,
  orderId,
  workshopId,
  workshops,
}: {
  assignment: Assignment;
  locale: AppLocale;
  orderId: string;
  workshopId: string | null;
  workshops: Array<{ id: string; isActive: boolean; managerName: string; name: string }>;
}) {
  const t = useTranslations("Admin.flow.orderCard");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [choice, setChoice] = useState(workshopId ?? "");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const current = workshops.find((workshop) => workshop.id === workshopId);
  const choices = workshops.filter((workshop) => workshop.isActive || workshop.id === workshopId);

  const send = () =>
    startTransition(async () => {
      const result = await sendOrderToWorkshopAction(locale, { note, orderId, workshopId: choice });
      setFeedback({ message: result.message, ok: result.ok });
      if (result.ok) setNote("");
      router.refresh();
    });

  return (
    <AdminCard title={t("workshopTitle")} description={current ? undefined : t("workshopHint")}>
      <div className="space-y-4">
        {current ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{current.name}</p>
              <p className="text-sm text-muted">{current.managerName ? t("managedBy", { name: current.managerName }) : t("noManager")}</p>
            </div>
            <ProgressRows assignment={assignment} />
          </div>
        ) : null}

        {workshops.length === 0 ? (
          <p className="text-sm text-muted">{t("noWorkshops")}</p>
        ) : (
          <div className="space-y-3 rounded-[0.8rem] border border-white/[0.06] bg-black/15 p-3.5">
            <AdminSelect label={current ? t("moveTo") : t("chooseWorkshop")} value={choice} onChange={(event) => setChoice(event.target.value)}>
              <option value="">{t("selectPlaceholder")}</option>
              {choices.map((workshop) => (
                <option key={workshop.id} value={workshop.id}>
                  {workshop.name}
                  {workshop.managerName ? ` – ${workshop.managerName}` : ""}
                </option>
              ))}
            </AdminSelect>
            <AdminTextarea label={t("noteForManager")} placeholder={t("notePlaceholder")} value={note} onChange={(event) => setNote(event.target.value)} />
            <AdminButton block variant="primary" disabled={pending || !choice} onClick={send}>
              <Send className="rtl:-scale-x-100" />
              {choice && choice === workshopId ? t("sendAgain") : t("send")}
            </AdminButton>
            {choice && choice !== workshopId && workshopId ? <p className="text-xs text-muted">{t("moveWarning")}</p> : null}
          </div>
        )}

        {feedback ? (
          <div className="admin-notice" data-tone={feedback.ok ? "success" : "error"} role="status">
            {feedback.message}
          </div>
        ) : null}
      </div>
    </AdminCard>
  );
}

/** Workshop manager: who in the team makes this piece. */
export function OrderManagerCard({
  assignment,
  assignmentNote,
  locale,
  orderId,
  team,
}: {
  assignment: Assignment;
  assignmentNote: string;
  locale: AppLocale;
  orderId: string;
  team: Array<{ id: string; name: string; openTasks: number }>;
}) {
  const t = useTranslations("Admin.flow.orderCard");
  const tw = useTranslations("Admin.flow.workshopOrders");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState(assignment.employeeId ?? "");
  const [note, setNote] = useState(assignmentNote);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);

  const save = () =>
    startTransition(async () => {
      const result = await assignOrderToEmployeeAction(locale, { assignmentNote: note, employeeId, orderId });
      setFeedback({ message: result.message, ok: result.ok });
      router.refresh();
    });

  return (
    <AdminCard title={t("teamTitle")} description={t("teamHint")}>
      <div className="space-y-4">
        <ProgressRows assignment={assignment} />
        <div className="space-y-3 rounded-[0.8rem] border border-white/[0.06] bg-black/15 p-3.5">
          <AdminSelect label={t("craftsman")} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
            <option value="">{team.length === 0 ? tw("noTeam") : tw("assignTo")}</option>
            {team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} {tw("taskCount", { count: member.openTasks })}
              </option>
            ))}
          </AdminSelect>
          <AdminTextarea label={t("noteForCraftsman")} placeholder={t("craftsmanNotePlaceholder")} value={note} onChange={(event) => setNote(event.target.value)} />
          <AdminButton block variant="primary" disabled={pending || !employeeId} onClick={save}>
            {assignment.employeeId && employeeId === assignment.employeeId ? t("updateNote") : t("assign")}
          </AdminButton>
        </div>
        {feedback ? (
          <div className="admin-notice" data-tone={feedback.ok ? "success" : "error"} role="status">
            {feedback.message}
          </div>
        ) : null}
      </div>
    </AdminCard>
  );
}
