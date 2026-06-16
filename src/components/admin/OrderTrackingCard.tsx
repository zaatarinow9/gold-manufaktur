"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { getTrackingLinkPath } from "@/lib/admin/tracking";
import type { OrderTrackingEvent, TrackingStatus } from "@/types/admin";
import { trackingStatusValues } from "@/types/admin";
import { AdminBadge } from "./AdminBadge";
import { AdminButton } from "./AdminButton";
import { AdminCard } from "./AdminCard";
import { AdminSelect } from "./AdminSelect";
import { OrderTrackingTimeline } from "./OrderTrackingTimeline";

type OrderTrackingCardProps = {
  actorName: string;
  customerEmail?: string;
  emailUpdatesEnabled: boolean;
  initialEvents: OrderTrackingEvent[];
  initialStatus: TrackingStatus;
  orderId: string;
  trackingNumber: string;
};

function formatTimestamp(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

export function OrderTrackingCard({
  actorName,
  customerEmail,
  emailUpdatesEnabled,
  initialEvents,
  initialStatus,
  orderId,
  trackingNumber,
}: OrderTrackingCardProps) {
  const locale = useLocale();
  const t = useTranslations("Admin");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(
    Boolean(customerEmail && emailUpdatesEnabled)
  );
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>(initialStatus);
  const [events, setEvents] = useState(initialEvents);
  const [nextStatus, setNextStatus] = useState<TrackingStatus>(initialStatus);
  const trackingPath = getTrackingLinkPath(locale, trackingNumber);
  const canNotifyCustomer = Boolean(customerEmail);
  const updatePanelId = `${orderId}-tracking-panel`;

  const sendCustomerNotification = async (
    status: TrackingStatus,
    message: string
  ) => {
    if (!customerEmail) {
      return false;
    }

    const trackingLink =
      typeof window === "undefined"
        ? trackingPath
        : new URL(trackingPath, window.location.origin).toString();
    const response = await fetch(`/api/admin/orders/${orderId}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerEmail,
        message,
        orderId,
        trackingLink,
        trackingNumber,
        trackingStatus: status,
      }),
    });

    return response.ok;
  };

  const handleCopyTrackingLink = async () => {
    const trackingLink =
      typeof window === "undefined"
        ? trackingPath
        : new URL(trackingPath, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(trackingLink);
      setFeedback(t("orders.copySuccess"));
    } catch {
      setFeedback(trackingLink);
    }
  };

  const handleNotifyCustomer = async () => {
    if (!customerEmail) {
      setFeedback(t("orders.noCustomerEmail"));
      return;
    }

    setIsSubmitting(true);

    try {
      const message = note || t("orders.notifyDefaultMessage");
      const success = await sendCustomerNotification(trackingStatus, message);
      setFeedback(success ? t("orders.customerNotified") : t("orders.notifyError"));
    } catch {
      setFeedback(t("orders.notifyError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveStatus = async () => {
    if (nextStatus === trackingStatus && note.trim().length === 0) {
      setFeedback(t("orders.noStatusChanges"));
      return;
    }

    setIsSubmitting(true);

    const nextEvent: OrderTrackingEvent = {
      id: `${orderId}-${Date.now()}`,
      status: nextStatus,
      title: t(`trackingStatus.${nextStatus}`),
      description: note || t("orders.statusSavedDescription"),
      createdAt: formatTimestamp(locale),
      createdBy: actorName,
      notifyCustomer: notifyCustomer && canNotifyCustomer,
    };

    try {
      if (notifyCustomer && canNotifyCustomer) {
        const success = await sendCustomerNotification(nextStatus, nextEvent.description);

        if (!success) {
          setFeedback(t("orders.notifyError"));
          setIsSubmitting(false);
          return;
        }
      }

      setEvents((current) => [...current, nextEvent]);
      setTrackingStatus(nextStatus);
      setNote("");
      setFeedback(
        notifyCustomer && canNotifyCustomer
          ? t("orders.statusSavedAndNotified")
          : t("orders.statusSaved")
      );
    } catch {
      setFeedback(t("orders.notifyError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminCard title={t("orders.trackingTitle")} description={t("orders.trackingDescription")}>
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("orders.trackingNumberLabel")}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{trackingNumber}</p>
          </div>
          <div className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-xs text-muted">{t("orders.trackingStatusLabel")}</p>
            <div className="mt-2">
              <AdminBadge variant="gold">{t(`trackingStatus.${trackingStatus}`)}</AdminBadge>
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
            onClick={() =>
              document.getElementById(updatePanelId)?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            {t("buttons.updateStatus")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={handleNotifyCustomer}
            disabled={!canNotifyCustomer || isSubmitting}
          >
            {t("buttons.notifyCustomer")}
          </AdminButton>
          <AdminButton size="sm" variant="ghost" onClick={handleCopyTrackingLink}>
            {t("buttons.copyTrackingLink")}
          </AdminButton>
        </div>

        {feedback ? (
          <div className="rounded-[0.95rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
            {feedback}
          </div>
        ) : null}

        <div
          id={updatePanelId}
          className="space-y-4 rounded-[1rem] border border-white/8 bg-black/18 p-4"
        >
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("orders.updatePanelTitle")}</h3>
            <p className="mt-1 text-sm text-muted">{t("orders.updatePanelDescription")}</p>
          </div>

          <AdminSelect
            label={t("orders.trackingStatusLabel")}
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as TrackingStatus)}
          >
            {trackingStatusValues.map((status) => (
              <option key={status} value={status}>
                {t(`trackingStatus.${status}`)}
              </option>
            ))}
          </AdminSelect>

          <label className="block space-y-2">
            <span className="admin-label">{t("orders.updateNoteLabel")}</span>
            <textarea
              className="admin-textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("orders.updateNotePlaceholder")}
            />
          </label>

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

          {!canNotifyCustomer ? (
            <p className="text-sm text-muted">{t("orders.noCustomerEmail")}</p>
          ) : null}

          <AdminButton
            block
            variant="primary"
            onClick={handleSaveStatus}
            disabled={isSubmitting}
          >
            {t("buttons.saveStatus")}
          </AdminButton>
        </div>

        <OrderTrackingTimeline events={events} />
      </div>
    </AdminCard>
  );
}
