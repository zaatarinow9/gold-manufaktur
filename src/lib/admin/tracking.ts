import { z } from "zod";

import type { OrderTrackingEvent, TrackingStatus, WorkshopOrder } from "@/types/admin";
import { trackingStatusValues } from "@/types/admin";

export const trackingNumberPattern = /^GH-\d{8}-\d{4}$/;

export function buildTrackingNumber(datePart: string, sequence: number) {
  return `GH-${datePart}-${String(sequence).padStart(4, "0")}`;
}

export function getTrackingLinkPath(locale: string, trackingNumber: string) {
  return `/${locale}/tracking/${trackingNumber}`;
}

export function findOrderByTrackingNumber(
  orders: WorkshopOrder[],
  trackingNumber: string
) {
  return orders.find((order) => order.trackingNumber === trackingNumber) ?? null;
}

export function getLatestTrackingEvent(events: OrderTrackingEvent[]) {
  return events[events.length - 1] ?? null;
}

export function createTrackingEvent(
  orderId: string,
  status: TrackingStatus,
  title: string,
  description: string,
  createdAt: string,
  createdBy: string,
  notifyCustomer = false
): OrderTrackingEvent {
  return {
    id: `${orderId}-${status}-${createdAt.replace(/[^0-9]/g, "")}`,
    status,
    title,
    description,
    createdAt,
    createdBy,
    notifyCustomer,
  };
}

export const orderNotificationSchema = z.object({
  customerEmail: z.string().email(),
  message: z.string().trim().min(1).max(500),
  orderId: z.string().trim().min(1),
  trackingLink: z.string().trim().min(1),
  trackingNumber: z.string().trim().regex(trackingNumberPattern),
  trackingStatus: z.enum(trackingStatusValues),
});
