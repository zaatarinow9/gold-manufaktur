import { z } from "zod";

import type { OrderTrackingEvent, TrackingStatus, WorkshopOrder } from "@/types/admin";
import { trackingStatusValues } from "@/types/admin";

// New tracking numbers end in a random 6-character code so they cannot be
// guessed by counting up from a date. Legacy numbers with a 4-digit sequence
// (GH-YYYYMMDD-0001) remain valid.
export const trackingNumberPattern = /^GH-\d{8}-(?:\d{4}|[A-HJ-NP-Z2-9]{6})$/;

const trackingCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRandomTrackingCode(length = 6) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (byte) => trackingCodeAlphabet[byte % trackingCodeAlphabet.length]
  ).join("");
}

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
