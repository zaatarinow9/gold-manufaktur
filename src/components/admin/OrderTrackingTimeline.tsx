"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";

import type { OrderTrackingEvent } from "@/types/admin";
import { AdminBadge } from "./AdminBadge";

type OrderTrackingTimelineProps = {
  className?: string;
  events: OrderTrackingEvent[];
  showActor?: boolean;
};

export function OrderTrackingTimeline({
  className,
  events,
  showActor = true,
}: OrderTrackingTimelineProps) {
  const t = useTranslations("Admin");
  const orderedEvents = [...events].reverse();

  return (
    <div className={clsx("space-y-3", className)}>
      {orderedEvents.map((event) => (
        <div
          key={event.id}
          className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
        >
          <div className="tracking-timeline-header flex flex-wrap items-start justify-between gap-3">
            <div className="tracking-timeline-copy space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{event.title}</p>
                <AdminBadge variant="neutral">
                  {t(`trackingStatus.${event.status}`)}
                </AdminBadge>
              </div>
              {showActor ? (
                <p className="text-sm text-muted">{event.createdBy}</p>
              ) : null}
            </div>
            <p className="text-xs text-muted">{event.createdAt}</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{event.description}</p>
        </div>
      ))}
    </div>
  );
}
