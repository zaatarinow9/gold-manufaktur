"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  archiveOrderAction,
  deleteOrderAction,
  updateOrderWorkflowAction,
  withdrawOrderAssignmentAction,
} from "@/app/[locale]/admin/orders/actions";
import { getOrderWorkflowCopy } from "@/lib/admin/orderWorkflow";
import { getTrackingLinkPath } from "@/lib/admin/tracking";
import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
} from "@/lib/admin/clientForm";
import type { EmployeeRecord } from "@/lib/db/employees";
import type { AppLocale } from "@/i18n/routing";
import type {
  AdminRole,
  OrderTrackingEvent,
  PublicTrackingStage,
  TrackingStatus,
} from "@/types/admin";
import { publicTrackingStageValues, trackingStatusValues } from "@/types/admin";

import { AdminBadge } from "./AdminBadge";
import { AdminButton } from "./AdminButton";
import { AdminCard } from "./AdminCard";
import { AdminInput } from "./AdminInput";
import { AdminSelect } from "./AdminSelect";
import { AdminTextarea } from "./AdminTextarea";
import { OrderTrackingTimeline } from "./OrderTrackingTimeline";

type OrderTrackingCardProps = {
  currentUserRole: AdminRole;
  customerEmail?: string;
  emailUpdatesEnabled: boolean;
  employees: EmployeeRecord[];
  initialAssignedWorkerEmail?: string;
  initialEvents?: OrderTrackingEvent[];
  initialPublicStage?: PublicTrackingStage | null;
  initialStatus: TrackingStatus;
  locale: AppLocale;
  orderId: string;
  showTimeline?: boolean;
  trackingNumber: string;
};

type FeedbackState =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

type SavedState = {
  publicStage: string;
  status: TrackingStatus;
  workerEmail: string;
};

function createSavedState(input: {
  publicStage?: PublicTrackingStage | null;
  status: TrackingStatus;
  workerEmail?: string | null;
}) {
  return {
    publicStage: input.publicStage ?? "",
    status: input.status,
    workerEmail: input.workerEmail?.trim().toLowerCase() ?? "",
  } satisfies SavedState;
}

function getOrderCardUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      archiveConfirm: "\u0647\u0644 \u062a\u0631\u064a\u062f \u0623\u0631\u0634\u0641\u0629 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628\u061f",
      description:
        "\u062d\u062f\u0651\u062b \u0627\u0644\u0639\u0627\u0645\u0644 \u0648\u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 \u0648\u0645\u0644\u0627\u062d\u0638\u0627\u062a\u0647 \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.",
      deleteConfirm: "\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0645\u0646 \u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0639\u0645\u0644\u061f",
      title: "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0637\u0644\u0628",
      workerEmailLabel: "\u0628\u0631\u064a\u062f \u0627\u0644\u0639\u0627\u0645\u0644",
      workerEmailPlaceholder: "worker@example.com",
      withdrawLabel: "\u0633\u062d\u0628 \u0627\u0644\u0625\u0633\u0646\u0627\u062f",
    };
  }

  if (locale === "de") {
    return {
      archiveConfirm: "Moechten Sie diesen Auftrag archivieren?",
      description:
        "Pflegen Sie Bearbeiter, Status und Hinweise zentral an einem Ort.",
      deleteConfirm: "Moechten Sie diesen Auftrag aus den aktiven Listen entfernen?",
      title: "Auftrag steuern",
      workerEmailLabel: "Mitarbeiter-E-Mail",
      workerEmailPlaceholder: "worker@example.com",
      withdrawLabel: "Zuweisung zurueckziehen",
    };
  }

  return {
    archiveConfirm: "Do you want to archive this order?",
    description: "Manage the worker assignment, status, and notes in one place.",
    deleteConfirm: "Do you want to remove this order from the active queues?",
    title: "Manage order",
    workerEmailLabel: "Worker email",
    workerEmailPlaceholder: "worker@example.com",
    withdrawLabel: "Withdraw assignment",
  };
}

export function OrderTrackingCard({
  currentUserRole,
  customerEmail,
  emailUpdatesEnabled,
  employees,
  initialAssignedWorkerEmail,
  initialEvents = [],
  initialPublicStage,
  initialStatus,
  locale,
  orderId,
  showTimeline = true,
  trackingNumber,
}: OrderTrackingCardProps) {
  const t = useTranslations("Admin");
  const copy = getOrderWorkflowCopy(locale);
  const uiCopy = getOrderCardUiCopy(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [workerEmail, setWorkerEmail] = useState(initialAssignedWorkerEmail ?? "");
  const [publicStage, setPublicStage] = useState(initialPublicStage ?? "");
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>(initialStatus);
  const [internalNote, setInternalNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [savedState, setSavedState] = useState(() =>
    createSavedState({
      publicStage: initialPublicStage,
      status: initialStatus,
      workerEmail: initialAssignedWorkerEmail,
    })
  );
  const requiredLabel = getRequiredFieldBadge(locale);

  const canManageAssignment = currentUserRole !== "employee";
  const trackingPath = getTrackingLinkPath(locale, trackingNumber);
  const suggestedWorkerEmails = Array.from(
    new Set(
      employees
        .map((employee) => employee.email.trim())
        .filter((email) => email.length > 0)
    )
  ).sort((left, right) => left.localeCompare(right, locale));
  const normalizedWorkerEmail = workerEmail.trim().toLowerCase();
  const hasChanges =
    normalizedWorkerEmail !== savedState.workerEmail ||
    publicStage !== savedState.publicStage ||
    trackingStatus !== savedState.status ||
    internalNote.trim().length > 0 ||
    customerNote.trim().length > 0;

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const nextState = { ...current };
      delete nextState[field];
      return nextState;
    });
  };

  const handleCopyTrackingLink = async () => {
    const trackingLink =
      typeof window === "undefined"
        ? trackingPath
        : new URL(trackingPath, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(trackingLink);
      setFeedback({ kind: "success", message: t("orders.copySuccess") });
    } catch {
      setFeedback({ kind: "success", message: trackingLink });
    }
  };

  const handleSave = () => {
    if (!hasChanges) {
      setFeedback({ kind: "error", message: copy.noChanges });
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result = await updateOrderWorkflowAction(locale, {
        customerNote,
        employeeId: null,
        internalNote,
        orderId,
        publicStage: publicStage ? (publicStage as PublicTrackingStage) : null,
        status: trackingStatus,
        workerEmail: canManageAssignment ? normalizedWorkerEmail : "",
        workshopId: null,
      });

      setFieldErrors(result.fieldErrors ?? {});
      setFeedback({
        kind: result.ok ? "success" : "error",
        message: result.message,
      });

      if (!result.ok) {
        focusFirstInvalidField(result.fieldErrors ?? {});
        return;
      }

      setCustomerNote("");
      setInternalNote("");
      setSavedState(
        createSavedState({
          publicStage: publicStage ? (publicStage as PublicTrackingStage) : null,
          status: trackingStatus,
          workerEmail: normalizedWorkerEmail,
        })
      );
      router.refresh();
    });
  };

  const handleWithdrawAssignment = () => {
    if (!savedState.workerEmail) {
      return;
    }

    startTransition(async () => {
      const result = await withdrawOrderAssignmentAction(locale, orderId);

      setFeedback({
        kind: result.ok ? "success" : "error",
        message: result.message,
      });

      if (!result.ok) {
        return;
      }

      setWorkerEmail("");
      setSavedState((current) => ({ ...current, workerEmail: "" }));
      router.refresh();
    });
  };

  const handleArchiveOrder = () => {
    if (!window.confirm(uiCopy.archiveConfirm)) {
      return;
    }

    startTransition(async () => {
      const result = await archiveOrderAction(locale, orderId);
      setFeedback({
        kind: result.ok ? "success" : "error",
        message: result.message,
      });

      if (result.ok) {
        router.refresh();
      }
    });
  };

  const handleDeleteOrder = () => {
    if (!window.confirm(uiCopy.deleteConfirm)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteOrderAction(locale, orderId);
      setFeedback({
        kind: result.ok ? "success" : "error",
        message: result.message,
      });

      if (result.ok) {
        router.refresh();
      }
    });
  };

  return (
    <AdminCard title={uiCopy.title} description={uiCopy.description}>
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("orders.trackingNumberLabel")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{trackingNumber}</p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("orders.customerEmailLabel")}</p>
            <p className="mt-2 text-sm text-foreground">
              {customerEmail || t("common.notProvided")}
            </p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("orders.publicStageLabel")}</p>
            <div className="mt-2">
              <AdminBadge variant="gold">
                {publicStage
                  ? t(`publicTrackingStage.${publicStage}`)
                  : t("orders.noPublicStage")}
              </AdminBadge>
            </div>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("orders.emailUpdatesLabel")}</p>
            <p className="mt-2 text-sm text-foreground">
              {emailUpdatesEnabled ? t("common.enabled") : t("common.disabled")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <AdminButton size="sm" variant="secondary" onClick={handleCopyTrackingLink}>
            {t("buttons.copyTrackingLink")}
          </AdminButton>
          {canManageAssignment && savedState.workerEmail ? (
            <AdminButton
              size="sm"
              variant="ghost"
              onClick={handleWithdrawAssignment}
              disabled={isPending}
            >
              {uiCopy.withdrawLabel}
            </AdminButton>
          ) : null}
          {canManageAssignment ? (
            <AdminButton
              size="sm"
              variant="ghost"
              onClick={handleArchiveOrder}
              disabled={isPending}
            >
              {t("buttons.archive")}
            </AdminButton>
          ) : null}
          {canManageAssignment ? (
            <AdminButton
              size="sm"
              variant="danger"
              onClick={handleDeleteOrder}
              disabled={isPending}
            >
              {t("buttons.delete")}
            </AdminButton>
          ) : null}
        </div>

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

        <div className="space-y-4 rounded-[1rem] border border-white/8 bg-black/18 p-4">
          {canManageAssignment ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <AdminInput
                id="workerEmail"
                name="workerEmail"
                type="email"
                list="worker-email-suggestions"
                label={uiCopy.workerEmailLabel}
                value={workerEmail}
                errorText={fieldErrors.workerEmail}
                placeholder={uiCopy.workerEmailPlaceholder}
                onChange={(event) => {
                  clearFieldError("workerEmail");
                  setWorkerEmail(event.target.value);
                }}
              />
              <datalist id="worker-email-suggestions">
                {suggestedWorkerEmails.map((email) => (
                  <option key={email} value={email} />
                ))}
              </datalist>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminSelect
              id="publicStage"
              name="publicStage"
              label={t("orders.publicStageLabel")}
              value={publicStage}
              helperText={t("orders.publicStageHelp")}
              onChange={(event) => {
                clearFieldError("publicStage");
                setPublicStage(event.target.value);
              }}
            >
              <option value="">{t("orders.noPublicStage")}</option>
              {publicTrackingStageValues.map((stage) => (
                <option key={stage} value={stage}>
                  {t(`publicTrackingStage.${stage}`)}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              id="status"
              name="status"
              label={t("orders.internalStatusLabel")}
              value={trackingStatus}
              errorText={fieldErrors.status}
              required
              requiredLabel={requiredLabel}
              onChange={(event) => {
                clearFieldError("status");
                setTrackingStatus(event.target.value as TrackingStatus);
              }}
            >
              {trackingStatusValues.map((status) => (
                <option key={status} value={status}>
                  {t(`trackingStatus.${status}`)}
                </option>
              ))}
            </AdminSelect>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminTextarea
              id="internalNote"
              name="internalNote"
              label={copy.internalNoteLabel}
              placeholder={copy.internalNotePlaceholder}
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
            />
            <AdminTextarea
              id="customerNote"
              name="customerNote"
              label={copy.customerNoteLabel}
              placeholder={copy.customerNotePlaceholder}
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
            />
          </div>

          {!customerEmail ? (
            <p className="text-sm text-muted">{t("orders.noCustomerEmail")}</p>
          ) : !emailUpdatesEnabled ? (
            <p className="text-sm text-muted">
              {t("orders.emailUpdatesLabel")}: {t("common.disabled")}
            </p>
          ) : (
            <p className="text-sm text-muted">{t("orders.publicStageEmailNotice")}</p>
          )}

          <AdminButton block variant="primary" onClick={handleSave} disabled={isPending}>
            {copy.saveUpdate}
          </AdminButton>
        </div>

        {showTimeline ? <OrderTrackingTimeline events={initialEvents} /> : null}
      </div>
    </AdminCard>
  );
}
