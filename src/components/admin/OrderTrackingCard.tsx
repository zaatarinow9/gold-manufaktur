"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  archiveOrderAction,
  assignOrderToEmployeeAction,
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
import {
  getAssignmentStatusMessageKey,
  getAssignmentStatusVariant,
} from "@/lib/admin/assignmentStatus";
import { getAdminPrivacyUiCopy } from "@/lib/admin/privacy";
import type { EmployeeRecord } from "@/lib/db/employees";
import type { AppLocale } from "@/i18n/routing";
import type {
  AdminRole,
  OrderAssignmentStatus,
  OrderTrackingEvent,
  PublicTrackingStage,
  TrackingStatus,
} from "@/types/admin";
import { publicTrackingStageValues, trackingStatusValues } from "@/types/admin";

import { AdminBadge } from "./AdminBadge";
import { AdminButton } from "./AdminButton";
import { AdminCard } from "./AdminCard";
import { useAdminPrivacyMode } from "./AdminPrivacyMode";
import { AdminSelect } from "./AdminSelect";
import { AdminTextarea } from "./AdminTextarea";
import { OrderTrackingTimeline } from "./OrderTrackingTimeline";

type OrderTrackingCardProps = {
  currentUserRole: AdminRole;
  customerEmail?: string;
  emailUpdatesEnabled: boolean;
  employees: EmployeeRecord[];
  initialAssignmentNote?: string;
  initialAssignmentStatus: OrderAssignmentStatus;
  initialEmployeeId?: string | null;
  initialEmployeeNote?: string;
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

type AssignmentState = {
  assignmentNote: string;
  employeeId: string;
};

type WorkflowState = {
  publicStage: string;
  status: TrackingStatus;
};

function createAssignmentState(input: {
  assignmentNote?: string | null;
  employeeId?: string | null;
}) {
  return {
    assignmentNote: input.assignmentNote?.trim() ?? "",
    employeeId: input.employeeId?.trim() ?? "",
  } satisfies AssignmentState;
}

function createWorkflowState(input: {
  publicStage?: PublicTrackingStage | null;
  status: TrackingStatus;
}) {
  return {
    publicStage: input.publicStage ?? "",
    status: input.status,
  } satisfies WorkflowState;
}

function getOrderCardUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      archiveConfirm: "\u0647\u0644 \u062a\u0631\u064a\u062f \u0623\u0631\u0634\u0641\u0629 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628\u061f",
      assignmentLabel: "\u0625\u0633\u0646\u0627\u062f \u0627\u0644\u0645\u0647\u0645\u0629",
      assignmentNoteLabel: "\u0645\u0644\u0627\u062d\u0638\u0629 \u0627\u0644\u0625\u0633\u0646\u0627\u062f",
      assignmentSection: "\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u0645\u0647\u0645\u0629",
      currentEmployee: "\u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0633\u0624\u0648\u0644",
      currentEmployeeNote: "\u0645\u0644\u0627\u062d\u0638\u0629 \u0627\u0644\u0645\u0648\u0638\u0641",
      currentStatus: "\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0647\u0645\u0629",
      deleteConfirm: "\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0645\u0646 \u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0639\u0645\u0644\u061f",
      description:
        "\u062d\u062f\u0651\u062b \u0627\u0644\u0625\u0633\u0646\u0627\u062f \u0648\u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 \u0648\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.",
      noEmployeeNote: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0645\u0648\u0638\u0641 \u0628\u0639\u062f.",
      reassignLabel: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0625\u0633\u0646\u0627\u062f",
      selectEmployee: "\u0627\u062e\u062a\u0631 \u0645\u0648\u0638\u0641\u0627\u064b",
      title: "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0637\u0644\u0628",
      trackingSection: "\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0637\u0644\u0628",
      withdrawLabel: "\u0633\u062d\u0628 \u0627\u0644\u0625\u0633\u0646\u0627\u062f",
    };
  }

  if (locale === "de") {
    return {
      archiveConfirm: "Moechten Sie diesen Auftrag archivieren?",
      assignmentLabel: "Aufgabe zuweisen",
      assignmentNoteLabel: "Zuweisungshinweis",
      assignmentSection: "Aufgabenverteilung",
      currentEmployee: "Zustaendiger Mitarbeiter",
      currentEmployeeNote: "Mitarbeiterhinweis",
      currentStatus: "Aufgabenstatus",
      deleteConfirm: "Moechten Sie diesen Auftrag aus den aktiven Listen entfernen?",
      description:
        "Pflegen Sie Zuweisung, Status und Hinweise zentral an einem Ort.",
      noEmployeeNote: "Es liegt noch kein Mitarbeiterhinweis vor.",
      reassignLabel: "Erneut zuweisen",
      selectEmployee: "Mitarbeiter auswaehlen",
      title: "Auftrag steuern",
      trackingSection: "Auftragsverlauf",
      withdrawLabel: "Zuweisung zurueckziehen",
    };
  }

  return {
    archiveConfirm: "Do you want to archive this order?",
    assignmentLabel: "Assign task",
    assignmentNoteLabel: "Assignment note",
    assignmentSection: "Task assignment",
    currentEmployee: "Assigned employee",
    currentEmployeeNote: "Employee note",
    currentStatus: "Task status",
    deleteConfirm: "Do you want to remove this order from the active queues?",
    description: "Manage assignment, status, and notes in one place.",
    noEmployeeNote: "No employee note has been added yet.",
    reassignLabel: "Reassign task",
    selectEmployee: "Select employee",
    title: "Manage order",
    trackingSection: "Order tracking",
    withdrawLabel: "Withdraw assignment",
  };
}

export function OrderTrackingCard({
  currentUserRole,
  customerEmail,
  emailUpdatesEnabled,
  employees,
  initialAssignmentNote,
  initialAssignmentStatus,
  initialEmployeeId,
  initialEmployeeNote,
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
  const privacyCopy = getAdminPrivacyUiCopy(locale);
  const { masked: privacyModeMasked } = useAdminPrivacyMode();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? "");
  const [assignmentNote, setAssignmentNote] = useState(initialAssignmentNote ?? "");
  const [assignmentStatus, setAssignmentStatus] =
    useState<OrderAssignmentStatus>(initialAssignmentStatus);
  const [publicStage, setPublicStage] = useState(initialPublicStage ?? "");
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>(initialStatus);
  const [internalNote, setInternalNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [savedAssignmentState, setSavedAssignmentState] = useState(() =>
    createAssignmentState({
      assignmentNote: initialAssignmentNote,
      employeeId: initialEmployeeId,
    })
  );
  const [savedWorkflowState, setSavedWorkflowState] = useState(() =>
    createWorkflowState({
      publicStage: initialPublicStage,
      status: initialStatus,
    })
  );
  const requiredLabel = getRequiredFieldBadge(locale);
  const trackingPath = getTrackingLinkPath(locale, trackingNumber);
  const activeEmployees = employees
    .filter((employee) => employee.isActive && employee.role === "employee")
    .sort((left, right) => left.fullName.localeCompare(right.fullName, locale));
  const currentEmployee =
    activeEmployees.find((employee) => employee.id === employeeId) ??
    employees.find((employee) => employee.id === employeeId) ??
    null;
  const assignmentChanged =
    employeeId !== savedAssignmentState.employeeId ||
    assignmentNote.trim() !== savedAssignmentState.assignmentNote;
  const workflowChanged =
    publicStage !== savedWorkflowState.publicStage ||
    trackingStatus !== savedWorkflowState.status ||
    internalNote.trim().length > 0 ||
    customerNote.trim().length > 0;

  if (currentUserRole === "employee") {
    return null;
  }

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
    if (privacyModeMasked) {
      setFeedback({ kind: "error", message: privacyCopy.activeDescription });
      return;
    }

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

  const handleAssignmentSave = () => {
    if (!assignmentChanged) {
      setFeedback({ kind: "error", message: copy.noChanges });
      return;
    }

    if (!employeeId) {
      const message = copy.invalidSelection;
      setFieldErrors({ employeeId: message });
      setFeedback({ kind: "error", message });
      return;
    }

    setFeedback(null);
    const employeeChanged = employeeId !== savedAssignmentState.employeeId;

    startTransition(async () => {
      const result = await assignOrderToEmployeeAction(locale, {
        assignmentNote,
        employeeId,
        orderId,
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

      setSavedAssignmentState(
        createAssignmentState({
          assignmentNote,
          employeeId,
        })
      );
      if (employeeChanged) {
        setAssignmentStatus("assigned");
      }
      router.refresh();
    });
  };

  const handleWorkflowSave = () => {
    if (!workflowChanged) {
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
        workerEmail: "",
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
      setSavedWorkflowState(
        createWorkflowState({
          publicStage: publicStage ? (publicStage as PublicTrackingStage) : null,
          status: trackingStatus,
        })
      );
      router.refresh();
    });
  };

  const handleWithdrawAssignment = () => {
    if (!savedAssignmentState.employeeId) {
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

      setEmployeeId("");
      setAssignmentNote("");
      setAssignmentStatus("returned");
      setSavedAssignmentState(
        createAssignmentState({
          assignmentNote: "",
          employeeId: null,
        })
      );
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
            <p className="mt-2 text-sm font-semibold text-foreground">
              {privacyModeMasked ? privacyCopy.hidden : trackingNumber}
            </p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("orders.customerEmailLabel")}</p>
            <p className="mt-2 text-sm text-foreground">
              {privacyModeMasked
                ? privacyCopy.hidden
                : customerEmail || t("common.notProvided")}
            </p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{uiCopy.currentStatus}</p>
            <div className="mt-2">
              <AdminBadge variant={getAssignmentStatusVariant(assignmentStatus)}>
                {t(getAssignmentStatusMessageKey(assignmentStatus))}
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
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={handleCopyTrackingLink}
            disabled={privacyModeMasked}
          >
            {t("buttons.copyTrackingLink")}
          </AdminButton>
          {savedAssignmentState.employeeId ? (
            <AdminButton
              size="sm"
              variant="ghost"
              onClick={handleWithdrawAssignment}
              disabled={isPending}
            >
              {uiCopy.withdrawLabel}
            </AdminButton>
          ) : null}
          {currentUserRole === "super_admin" ? (
            <>
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={handleArchiveOrder}
                disabled={isPending}
              >
                {t("buttons.archive")}
              </AdminButton>
              <AdminButton
                size="sm"
                variant="danger"
                onClick={handleDeleteOrder}
                disabled={isPending}
              >
                {t("buttons.delete")}
              </AdminButton>
            </>
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

        <section className="space-y-4 rounded-[1rem] border border-white/8 bg-black/18 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {uiCopy.assignmentSection}
            </h3>
            <AdminBadge variant={getAssignmentStatusVariant(assignmentStatus)}>
              {t(getAssignmentStatusMessageKey(assignmentStatus))}
            </AdminBadge>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
              <p className="text-xs text-muted">{uiCopy.currentEmployee}</p>
              <p className="mt-2 text-sm text-foreground">
                {currentEmployee?.fullName || copy.noWorkshopAssigned}
              </p>
            </div>
            <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3 lg:col-span-2">
              <p className="text-xs text-muted">{uiCopy.currentEmployeeNote}</p>
              <p className="mt-2 text-sm text-foreground">
                {initialEmployeeNote?.trim() || uiCopy.noEmployeeNote}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <AdminSelect
              id="employeeId"
              name="employeeId"
              label={copy.employeeLabel}
              value={employeeId}
              errorText={fieldErrors.employeeId}
              required
              requiredLabel={requiredLabel}
              onChange={(event) => {
                clearFieldError("employeeId");
                setEmployeeId(event.target.value);
              }}
            >
              <option value="">{uiCopy.selectEmployee}</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                  {employee.email ? ` - ${employee.email}` : ""}
                </option>
              ))}
            </AdminSelect>
            <div className="flex items-end">
              <AdminButton
                block
                variant="primary"
                onClick={handleAssignmentSave}
                disabled={isPending}
              >
                {savedAssignmentState.employeeId
                  ? uiCopy.reassignLabel
                  : uiCopy.assignmentLabel}
              </AdminButton>
            </div>
          </div>

          <AdminTextarea
            id="assignmentNote"
            name="assignmentNote"
            label={uiCopy.assignmentNoteLabel}
            value={assignmentNote}
            onChange={(event) => setAssignmentNote(event.target.value)}
          />
        </section>

        <section className="space-y-4 rounded-[1rem] border border-white/8 bg-black/18 p-4">
          <h3 className="text-sm font-semibold text-foreground">{uiCopy.trackingSection}</h3>

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

          <AdminButton block variant="primary" onClick={handleWorkflowSave} disabled={isPending}>
            {copy.saveUpdate}
          </AdminButton>
        </section>

        {showTimeline ? <OrderTrackingTimeline events={initialEvents} /> : null}
      </div>
    </AdminCard>
  );
}
