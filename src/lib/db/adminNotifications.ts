import "server-only";

import type { AdminViewer } from "@/lib/db/adminScope";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/types";

type AdminNavCounts = Partial<
  Record<
    | "overview"
    | "products"
    | "categories"
    | "gallery"
    | "options"
    | "orders"
    | "settings",
    number
  >
>;

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
  const [{ data: orders, error: ordersError }, { data: tickets, error: ticketsError }] =
    await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("support_tickets").select("order_id, status"),
    ]);

  if (ordersError) {
    console.warn(`[adminNotifications] ${ordersError.message}`);
    return {};
  }

  if (ticketsError) {
    console.warn(`[adminNotifications] ${ticketsError.message}`);
  }

  const visibleOrders =
    viewer.role === "employee"
      ? (orders ?? []).filter((order) => belongsToWorker(viewer, order))
      : (orders ?? []).filter((order) => !isDeletedOrder(order));
  const openSupportCount = (tickets ?? []).filter(
    (ticket) => ticket.status === "open" || ticket.status === "in_progress"
  ).length;

  if (viewer.role === "employee") {
    return {
      orders: visibleOrders.filter(isActiveQueueOrder).length,
    };
  }

  return {
    orders: visibleOrders.filter(needsAdminAttention).length,
    overview: openSupportCount,
  };
}
