"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { updateOrderWorkflowAction } from "@/app/[locale]/admin/orders/actions";
import { getOrderWorkflowCopy } from "@/lib/admin/orderWorkflow";
import { getTrackingLinkPath } from "@/lib/admin/tracking";
import type { EmployeeRecord } from "@/lib/db/employees";
import type { WorkshopRecord } from "@/lib/db/workshops";
import type { AppLocale } from "@/i18n/routing";
import type { AdminRole, OrderTrackingEvent, TrackingStatus } from "@/types/admin";
import { trackingStatusValues } from "@/types/admin";

import { AdminBadge } from "./AdminBadge";
import { AdminButton } from "./AdminButton";
import { AdminCard } from "./AdminCard";
import { AdminSelect } from "./AdminSelect";
import { AdminTextarea } from "./AdminTextarea";
import { OrderTrackingTimeline } from "./OrderTrackingTimeline";

type OrderTrackingCardProps = {
  currentUserRole: AdminRole;
  customerEmail?: string;
  emailUpdatesEnabled: boolean;
  employees: EmployeeRecord[];
  initialEmployeeId?: string | null;
  initialEvents?: OrderTrackingEvent[];
  initialStatus: TrackingStatus;
  initialWorkshopId?: string | null;
  locale: AppLocale;
  orderId: string;
  showTimeline?: boolean;
  trackingNumber: string;
  workshops: WorkshopRecord[];
};

type FeedbackState =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

type SavedState = {
  employeeId: string;
  status: TrackingStatus;
  workshopId: string;
};

function createSavedState(input: {
  employeeId?: string | null;
  status: TrackingStatus;
  workshopId?: string | null;
}) {
  return {
    employeeId: input.employeeId ?? "",
    status: input.status,
    workshopId: input.workshopId ?? "",
  } satisfies SavedState;
}

export function OrderTrackingCard({
  currentUserRole,
  customerEmail,
  emailUpdatesEnabled,
  employees,
  initialEmployeeId,
  initialEvents = [],
  initialStatus,
  initialWorkshopId,
  locale,
  orderId,
  showTimeline = true,
  trackingNumber,
  workshops,
}: OrderTrackingCardProps) {
  const t = useTranslations("Admin");
  const copy = getOrderWorkflowCopy(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [workshopId, setWorkshopId] = useState(initialWorkshopId ?? "");
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? "");
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>(initialStatus);
  const [internalNote, setInternalNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(
    Boolean(customerEmail && emailUpdatesEnabled)
  );
  const [savedState, setSavedState] = useState(() =>
    createSavedState({
      employeeId: initialEmployeeId,
      status: initialStatus,
      workshopId: initialWorkshopId,
    })
  );

  const canChangeAssignment = currentUserRole !== "employee";
  const canNotifyCustomer = Boolean(customerEmail && emailUpdatesEnabled);
  const trackingPath = getTrackingLinkPath(locale, trackingNumber);
  const availableEmployees = workshopId
    ? employees.filter((employee) => employee.workshopId === workshopId)
    : [];
  const hasChanges =
    workshopId !== savedState.workshopId ||
    employeeId !== savedState.employeeId ||
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

  const handleWorkshopChange = (value: string) => {
    clearFieldError("workshopId");
    clearFieldError("employeeId");
    setWorkshopId(value);

    if (!value) {
      setEmployeeId("");
      return;
    }

    const employeeStillValid = availableEmployees.some(
      (employee) => employee.id === employeeId && employee.workshopId === value
    );

    if (!employeeStillValid) {
      setEmployeeId("");
    }
  };

  const handleSave = () => {
    if (!hasChanges) {
      setFeedback({ kind: "error", message: copy.noChanges });
      return;
    }

    if (employeeId && !workshopId) {
      const message = copy.employeeRequiresWorkshop;
      setFieldErrors({ workshopId: message });
      setFeedback({ kind: "error", message });
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result = await updateOrderWorkflowAction(locale, {
        customerNote,
        employeeId: canChangeAssignment ? employeeId || null : null,
        internalNote,
        notifyCustomer: canNotifyCustomer ? notifyCustomer : false,
        orderId,
        status: trackingStatus,
        workshopId: canChangeAssignment ? workshopId || null : null,
      });

      setFieldErrors(result.fieldErrors ?? {});
      setFeedback({
        kind: result.ok ? "success" : "error",
        message: result.message,
      });

      if (!result.ok) {
        return;
      }

      setCustomerNote("");
      setInternalNote("");
      setSavedState(
        createSavedState({
          employeeId,
          status: trackingStatus,
          workshopId,
        })
      );
      router.refresh();
    });
  };

  return (
    <AdminCard title={copy.assignmentTitle} description={copy.assignmentDescription}>
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("orders.trackingNumberLabel")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{trackingNumber}</p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("orders.trackingStatusLabel")}</p>
            <div className="mt-2">
              <AdminBadge variant="gold">
                {t(`trackingStatus.${trackingStatus}`)}
              </AdminBadge>
            </div>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("orders.customerEmailLabel")}</p>
            <p className="mt-2 text-sm text-foreground">{customerEmail ?? "-"}</p>
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
          >
            {t("buttons.copyTrackingLink")}
          </AdminButton>
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
          {canChangeAssignment ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <AdminSelect
                label={copy.workshopLabel}
                value={workshopId}
                helperText={fieldErrors.workshopId}
                className={fieldErrors.workshopId ? "border-rose-400/30" : undefined}
                onChange={(event) => handleWorkshopChange(event.target.value)}
              >
                <option value="">{copy.noWorkshopAssigned}</option>
                {workshops.map((workshop) => (
                  <option key={workshop.id} value={workshop.id}>
                    {workshop.name}
                  </option>
                ))}
              </AdminSelect>

              <AdminSelect
                label={copy.employeeLabel}
                value={employeeId}
                helperText={fieldErrors.employeeId}
                className={fieldErrors.employeeId ? "border-rose-400/30" : undefined}
                onChange={(event) => {
                  clearFieldError("employeeId");
                  setEmployeeId(event.target.value);
                }}
              >
                <option value="">{t("common.unassigned")}</option>
                {availableEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </AdminSelect>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminSelect
              label={t("orders.trackingStatusLabel")}
              value={trackingStatus}
              helperText={fieldErrors.status}
              className={fieldErrors.status ? "border-rose-400/30" : undefined}
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
              label={copy.internalNoteLabel}
              placeholder={copy.internalNotePlaceholder}
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
            />
            <AdminTextarea
              label={copy.customerNoteLabel}
              placeholder={copy.customerNotePlaceholder}
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
            />
          </div>

          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#c49a52]"
              checked={notifyCustomer}
              disabled={!canNotifyCustomer}
              onChange={(event) => setNotifyCustomer(event.target.checked)}
            />
            <span className="text-sm text-foreground">{t("orders.notifyByEmail")}</span>
          </label>

          {!customerEmail ? (
            <p className="text-sm text-muted">{t("orders.noCustomerEmail")}</p>
          ) : null}

          {customerEmail && !emailUpdatesEnabled ? (
            <p className="text-sm text-muted">
              {t("orders.emailUpdatesLabel")}: {t("common.disabled")}
            </p>
          ) : null}

          <AdminButton
            block
            variant="primary"
            onClick={handleSave}
            disabled={isPending}
          >
            {copy.saveUpdate}
          </AdminButton>
        </div>

        {showTimeline ? <OrderTrackingTimeline events={initialEvents} /> : null}
      </div>
    </AdminCard>
  );
}
