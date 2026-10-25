import "server-only";

import { getDecoyNotifications } from "@/lib/admin/decoyData";
import { isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import type { AdminViewer } from "@/lib/db/adminScope";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, TableInsert } from "@/lib/supabase/types";

export type AdminNotificationRecord = {
  createdAt: string;
  id: string;
  isRead: boolean;
  linkPath: string;
  /** The order or record it points to no longer exists. */
  isStale?: boolean;
  message: string;
  title: string;
  type:
    | "employee_created"
    | "employee_updated"
    | "order_created"
    | "order_updated"
    | "system"
    | "ticket_created"
    | "ticket_updated"
    | "workshop_created"
    | "workshop_updated";
};

type CreateAdminNotificationInput = {
  employeeId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  linkPath?: string;
  message: string;
  metadata?: Json;
  profileId?: string | null;
  title: string;
  type: TableInsert<"admin_notifications">["type"];
  workshopId?: string | null;
};

function canViewNotification(
  viewer: AdminViewer,
  notification: {
    employee_id: string | null;
    profile_id: string | null;
    workshop_id: string | null;
  }
) {
  // Personal notifications belong to one person only.
  if (notification.profile_id) {
    return notification.profile_id === viewer.id;
  }

  if (viewer.role === "super_admin") {
    return true;
  }

  if (viewer.role === "admin") {
    return true;
  }

  if (notification.employee_id && viewer.linkedEmployeeId) {
    return notification.employee_id === viewer.linkedEmployeeId;
  }

  if (notification.workshop_id && viewer.managedWorkshopId) {
    return notification.workshop_id === viewer.managedWorkshopId;
  }

  if (notification.workshop_id && viewer.workshopId) {
    return notification.workshop_id === viewer.workshopId;
  }

  return viewer.role !== "employee";
}

export async function getScopedAdminNotifications(
  viewer: AdminViewer,
  limit = 6
): Promise<AdminNotificationRecord[]> {
  if (await isAdminDecoyEnabled()) {
    return getDecoyNotifications().slice(0, limit);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 3, limit));

  if (error) {
    console.warn(`[notifications] ${error.message}`);
    return [];
  }

  const visible = data
    .filter((notification) => canViewNotification(viewer, notification))
    .slice(0, limit);

  // Links to orders that were reset or deleted would open an empty page.
  const orderIds = visible
    .map((notification) => notification.link_path?.match(/^\/admin\/orders\/([0-9a-f-]{36})/i)?.[1])
    .filter((id): id is string => Boolean(id));
  let existingOrderIds = new Set<string>();
  if (orderIds.length > 0) {
    const { data: existing } = await supabase.from("orders").select("id").in("id", orderIds);
    existingOrderIds = new Set((existing ?? []).map((row) => row.id));
  }

  return visible.map((notification) => {
    const linkedOrderId = notification.link_path?.match(/^\/admin\/orders\/([0-9a-f-]{36})/i)?.[1];
    const isStale = Boolean(linkedOrderId && !existingOrderIds.has(linkedOrderId));
    return {
      createdAt: notification.created_at,
      id: notification.id,
      isRead: notification.is_read,
      isStale,
      linkPath: isStale ? "" : notification.link_path ?? "",
      message: notification.message,
      title: notification.title,
      type: notification.type,
    };
  });
}

async function getVisibleNotificationIds(viewer: AdminViewer, ids?: string[]) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("admin_notifications").select("id, employee_id, profile_id, workshop_id");
  if (ids) query = query.in("id", ids);
  const { data, error } = await query;
  if (error) throw new Error("NOTIFICATION_UPDATE_FAILED");
  return (data ?? []).filter((row) => canViewNotification(viewer, row)).map((row) => row.id);
}

/** Marks one notification, or every visible one, as read. */
export async function markAdminNotificationsRead(viewer: AdminViewer, ids?: string[]) {
  const visibleIds = await getVisibleNotificationIds(viewer, ids);
  if (visibleIds.length === 0) return 0;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("admin_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .in("id", visibleIds);
  if (error) throw new Error("NOTIFICATION_UPDATE_FAILED");
  return visibleIds.length;
}

/** Deletes one notification, or every visible one. */
export async function deleteAdminNotifications(viewer: AdminViewer, ids?: string[]) {
  const visibleIds = await getVisibleNotificationIds(viewer, ids);
  if (visibleIds.length === 0) return 0;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("admin_notifications").delete().in("id", visibleIds);
  if (error) throw new Error("NOTIFICATION_UPDATE_FAILED");
  return visibleIds.length;
}

export async function createAdminNotification(input: CreateAdminNotificationInput) {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("admin_notifications")
      .insert({
        employee_id: input.employeeId ?? null,
        entity_id: input.entityId ?? null,
        entity_type: input.entityType ?? null,
        link_path: input.linkPath ?? null,
        message: input.message,
        metadata_json: input.metadata ?? {},
        profile_id: input.profileId ?? null,
        title: input.title,
        type: input.type,
        workshop_id: input.workshopId ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.warn(`[notifications] Unable to create notification: ${error.message}`);
      return null;
    }

    return data.id;
  } catch (error) {
    console.warn(
      `[notifications] Unable to create notification: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}
