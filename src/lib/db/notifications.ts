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
  if (viewer.role === "super_admin") {
    return true;
  }

  if (notification.profile_id) {
    return notification.profile_id === viewer.id;
  }

  if (viewer.role === "admin") {
    return true;
  }

  if (notification.employee_id && viewer.linkedEmployeeId) {
    return notification.employee_id === viewer.linkedEmployeeId;
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

  return data
    .filter((notification) => canViewNotification(viewer, notification))
    .slice(0, limit)
    .map((notification) => ({
      createdAt: notification.created_at,
      id: notification.id,
      isRead: notification.is_read,
      linkPath: notification.link_path ?? "",
      message: notification.message,
      title: notification.title,
      type: notification.type,
    }));
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
