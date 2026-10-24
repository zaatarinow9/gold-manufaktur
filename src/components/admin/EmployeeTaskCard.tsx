"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { updateMyTaskAction } from "@/app/[locale]/admin/orders/actions";
import type { AppLocale } from "@/i18n/routing";
import {
  getAssignmentStatusMessageKey,
  getAssignmentStatusVariant,
} from "@/lib/admin/assignmentStatus";
import type { OrderAssignmentStatus } from "@/types/admin";

import { AdminBadge } from "./AdminBadge";
import { AdminButton } from "./AdminButton";
import { AdminCard } from "./AdminCard";
import { AdminSelect } from "./AdminSelect";
import { AdminTextarea } from "./AdminTextarea";

type EmployeeTaskCardProps = {
  assignmentNote?: string;
  dueDate?: string;
  initialEmployeeNote?: string;
  initialStatus: OrderAssignmentStatus;
  locale: AppLocale;
  orderId: string;
};

type FeedbackState =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

type EmployeeTaskStatus = Extract<
  OrderAssignmentStatus,
  "assigned" | "accepted" | "in_progress" | "waiting" | "completed"
>;

const editableStatuses: Array<Exclude<OrderAssignmentStatus, "assigned" | "returned">> = [
  "accepted",
  "in_progress",
  "waiting",
  "completed",
];

function useTaskCardCopy() {
  const t = useTranslations("Admin.taskCard");

  return {
    assignmentNote: t("assignmentNote"),
    dueDate: t("dueDate"),
    employeeNote: t("employeeNote"),
    noAssignmentNote: t("noAssignmentNote"),
    save: t("save"),
    status: t("status"),
    title: t("title"),
  };
}

export function EmployeeTaskCard({
  assignmentNote,
  dueDate,
  initialEmployeeNote,
  initialStatus,
  locale,
  orderId,
}: EmployeeTaskCardProps) {
  const copy = useTaskCardCopy();
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const initialTaskStatus: EmployeeTaskStatus =
    initialStatus === "returned" ? "assigned" : initialStatus;
  const [status, setStatus] = useState<EmployeeTaskStatus>(initialTaskStatus);
  const [employeeNote, setEmployeeNote] = useState(initialEmployeeNote ?? "");
  const [savedState, setSavedState] = useState({
    employeeNote: initialEmployeeNote?.trim() ?? "",
    status: initialTaskStatus,
  });
  const statusOptions = useMemo(() => {
    if (initialTaskStatus === "assigned") {
      return ["assigned", ...editableStatuses] satisfies EmployeeTaskStatus[];
    }

    return editableStatuses;
  }, [initialTaskStatus]);

  const hasChanges =
    status !== savedState.status ||
    employeeNote.trim() !== savedState.employeeNote;

  const handleSave = () => {
    if (!hasChanges) {
      return;
    }

    startTransition(async () => {
      const result = await updateMyTaskAction(locale, {
        employeeNote,
        orderId,
        status,
      });

      setFeedback({
        kind: result.ok ? "success" : "error",
        message: result.message,
      });

      if (!result.ok) {
        return;
      }

      setSavedState({
        employeeNote: employeeNote.trim(),
        status,
      });
      router.refresh();
    });
  };

  return (
    <AdminCard title={copy.title}>
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{copy.status}</p>
            <div className="mt-2">
              <AdminBadge variant={getAssignmentStatusVariant(status)}>
                {t(getAssignmentStatusMessageKey(status))}
              </AdminBadge>
            </div>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{copy.dueDate}</p>
            <p className="mt-2 text-sm text-foreground">{dueDate || "-"}</p>
          </div>
        </div>

        <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
          <p className="text-xs text-muted">{copy.assignmentNote}</p>
          <p className="mt-2 text-sm text-foreground">
            {assignmentNote?.trim() || copy.noAssignmentNote}
          </p>
        </div>

        <AdminSelect
          id="taskStatus"
          name="taskStatus"
          label={copy.status}
          value={status}
          onChange={(event) => setStatus(event.target.value as EmployeeTaskStatus)}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {t(getAssignmentStatusMessageKey(option))}
            </option>
          ))}
        </AdminSelect>

        <AdminTextarea
          id="employeeNote"
          name="employeeNote"
          label={copy.employeeNote}
          value={employeeNote}
          onChange={(event) => setEmployeeNote(event.target.value)}
        />

        {feedback ? (
          <div
            className={
              feedback.kind === "success"
                ? "rounded-[0.95rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground"
                : "rounded-[0.95rem] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
            }
          >
            {feedback.message}
          </div>
        ) : null}

        <AdminButton
          block
          variant="primary"
          onClick={handleSave}
          disabled={isPending || !hasChanges}
        >
          {copy.save}
        </AdminButton>
      </div>
    </AdminCard>
  );
}
