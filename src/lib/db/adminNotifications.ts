import "server-only";

import type { AdminViewer } from "@/lib/db/adminScope";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/types";
import { getAdminSettingsSnapshot } from "@/lib/db/siteSettings";

type AdminNavCounts = Partial<
  Record<
    | "overview"
    | "products"
    | "categories"
    | "gallery"
    | "inquiries"
    | "options"
    | "orders"
    | "settings",
    number
  >
>;

type InquiryNotificationRow = {
  archived_at: string | null;
  deleted_at: string | null;
  id: string;
  status: string | null;
};

type InquiryNotificationClient = {
  from: (table: "customer_inquiries") => {
    select: (columns: string) => Promise<{
      data: InquiryNotificationRow[] | null;
      error: { message: string } | null;
    }>;
  };
};

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isArchivedOrder(order: Partial<TableRow<"orders">>) {
  return Boolean(order.archived_at);
}

function isDeletedOrder(order: Partial<TableRow<"orders">>) {
  return Boolean(order.deleted_at);
}

function isCancelledOrder(order: Partial<TableRow<"orders">>) {
  return Boolean(order.cancelled_at) || order.tracking_status === "cancelled";
}

function isCompletedOrder(order: Partial<TableRow<"orders">>) {
  return (
    Boolean(order.completed_at) ||
    order.tracking_status === "completed" ||
    order.tracking_status === "picked_up" ||
    order.tracking_status === "delivered_to_store"
  );
}

function isActiveQueueOrder(order: Partial<TableRow<"orders">>) {
  return (
    !isArchivedOrder(order) &&
    !isDeletedOrder(order) &&
    !isCancelledOrder(order) &&
    !isCompletedOrder(order)
  );
}

function needsAdminAttention(order: Partial<TableRow<"orders">>) {
  if (!isActiveQueueOrder(order)) {
    return false;
  }

  const hasWorkerAssignment = normalizeEmail(order.assigned_worker_email).length > 0;
  const hasLegacyAssignment = Boolean(order.employee_id);

  if (!hasWorkerAssignment && !hasLegacyAssignment) {
    return true;
  }

  return (
    order.tracking_status === "created" ||
    order.tracking_status === "sent_to_workshop" ||
    order.tracking_status === "accepted_by_workshop" ||
    order.status === "draft" ||
    order.status === "sent_to_workshop"
  );
}

function belongsToWorker(viewer: AdminViewer, order: Partial<TableRow<"orders">>) {
  const workerEmail = normalizeEmail(order.assigned_worker_email);

  if (workerEmail && workerEmail === normalizeEmail(viewer.email)) {
    return true;
  }

  if (viewer.linkedEmployeeId && order.employee_id === viewer.linkedEmployeeId) {
    return true;
  }

  return false;
}

export async function getAdminNavCounts(viewer: AdminViewer): Promise<AdminNavCounts> {
  const supabase = await createSupabaseServerClient();
  const [
    { data: orders, error: ordersError },
    { data: tickets, error: ticketsError },
    inquiriesResult,
    settingsSnapshot,
  ] =
    await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("support_tickets").select("order_id, status"),
      (supabase as unknown as InquiryNotificationClient)
        .from("customer_inquiries")
        .select("id, status, archived_at, deleted_at"),
      getAdminSettingsSnapshot().catch(() => null),
    ]);

  if (ordersError) {
    console.warn(`[adminNotifications] ${ordersError.message}`);
    return {};
  }

  if (ticketsError) {
    console.warn(`[adminNotifications] ${ticketsError.message}`);
  }

  const inquiries = Array.isArray(inquiriesResult?.data) ? inquiriesResult.data : [];
  const visibleOrders =
    viewer.role === "employee"
      ? (orders ?? []).filter((order) => belongsToWorker(viewer, order))
      : (orders ?? []).filter((order) => !isDeletedOrder(order));
  const openSupportCount = (tickets ?? []).filter(
    (ticket) => ticket.status === "open" || ticket.status === "in_progress"
  ).length;
  const unreadInquiryCount = inquiries.filter(
    (inquiry) =>
      inquiry.status === "new" &&
      !inquiry.archived_at &&
      !inquiry.deleted_at
  ).length;
  const settingsCount =
    settingsSnapshot &&
    settingsSnapshot.diagnostics.available &&
    settingsSnapshot.adminNotificationEmail &&
    settingsSnapshot.smtpStatus.configured
      ? 0
      : 1;

  if (viewer.role === "employee") {
    return {
      orders: visibleOrders.filter(isActiveQueueOrder).length,
    };
  }

  return {
    inquiries: unreadInquiryCount,
    orders: visibleOrders.filter(needsAdminAttention).length,
    overview: openSupportCount,
    settings: settingsCount,
  };
}
