"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { updateMyTaskAction } from "@/app/[locale]/admin/orders/actions";
import type { AppLocale } from "@/i18n/routing";
import {
  employeeTaskStatusValues,
  getAssignmentStatusMessageKey,
  getAssignmentStatusVariant,
  statusesNeedingNote,
  type EmployeeTaskStatus,
} from "@/lib/admin/assignmentStatus";
import type { OrderAssignmentStatus } from "@/types/admin";

import { AdminBadge } from "./AdminBadge";
import { AdminButton } from "./AdminButton";
import { AdminCard } from "./AdminCard";
import { AdminTextarea } from "./AdminTextarea";

type EmployeeTaskCardProps = {
  assignmentNote?: string;
  dueDate?: string;
  initialEmployeeNote?: string;
  initialStatus: OrderAssignmentStatus;
  locale: AppLocale;
  orderId: string;
};

function asTaskStatus(status: OrderAssignmentStatus): EmployeeTaskStatus | null {
  return (employeeTaskStatusValues as readonly string[]).includes(status) ? (status as EmployeeTaskStatus) : null;
}

/** The employee's own controls: where the piece stands, and what's wrong if anything. */
export function EmployeeTaskCard({
  assignmentNote,
  dueDate,
  initialEmployeeNote,
  initialStatus,
  locale,
  orderId,
}: EmployeeTaskCardProps) {
  const t = useTranslations("Admin.flow.task");
  const tc = useTranslations("Admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const [status, setStatus] = useState<EmployeeTaskStatus | null>(asTaskStatus(initialStatus));
  const [note, setNote] = useState(initialEmployeeNote ?? "");
  const needsNote = status ? statusesNeedingNote.includes(status) : false;
  const changed = status !== asTaskStatus(initialStatus) || note.trim() !== (initialEmployeeNote ?? "").trim();

  const save = () => {
    if (!status) return;
    startTransition(async () => {
      const result = await updateMyTaskAction(locale, { employeeNote: note, orderId, status });
      setFeedback({ message: result.message, ok: result.ok });
      if (result.ok) router.refresh();
    });
  };

  return (
    <AdminCard title={t("title")} description={t("hint")}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">{t("now")}</span>
          <AdminBadge variant={getAssignmentStatusVariant(initialStatus)}>{tc(getAssignmentStatusMessageKey(initialStatus))}</AdminBadge>
          {dueDate ? <span className="ms-auto text-muted">{t("due", { date: dueDate })}</span> : null}
        </div>

        {assignmentNote?.trim() ? (
          <div className="rounded-[0.8rem] border border-gold/15 bg-gold/[0.06] px-4 py-3">
            <p className="text-xs text-gold-soft">{t("managerNote")}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{assignmentNote}</p>
          </div>
        ) : null}

        <fieldset>
          <legend className="admin-label mb-2">{t("choose")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {employeeTaskStatusValues.map((value) => (
              <label
                key={value}
                className={clsx(
                  "flex cursor-pointer flex-col gap-0.5 rounded-[0.75rem] border px-3.5 py-3 transition",
                  status === value
                    ? value === "declined" || value === "problem"
                      ? "border-rose-400/50 bg-rose-400/[0.08]"
                      : "border-gold/50 bg-gold/[0.08]"
                    : "border-white/[0.08] hover:border-white/20"
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`task-status-${orderId}`}
                    value={value}
                    checked={status === value}
                    onChange={() => setStatus(value)}
                    className="accent-[var(--color-gold)]"
                  />
                  <span className="text-sm font-semibold text-foreground">{tc(getAssignmentStatusMessageKey(value))}</span>
                </span>
                <span className="ps-6 text-xs leading-5 text-muted">{t(`explain.${value}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <AdminTextarea
          label={needsNote ? t("reasonLabel") : t("noteLabel")}
          required={needsNote}
          placeholder={needsNote ? t("reasonPlaceholder") : t("notePlaceholder")}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        {feedback ? (
          <div className="admin-notice" data-tone={feedback.ok ? "success" : "error"} role="status">
            {feedback.message}
          </div>
        ) : null}

        <AdminButton block variant="primary" onClick={save} disabled={pending || !status || !changed || (needsNote && !note.trim())}>
          {pending ? t("saving") : t("save")}
        </AdminButton>
      </div>
    </AdminCard>
  );
}
