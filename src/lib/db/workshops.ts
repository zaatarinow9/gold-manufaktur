import "server-only";

import { z } from "zod";

import { getDecoyWorkshops } from "@/lib/admin/decoyData";
import { isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import type { AdminViewer } from "@/lib/db/adminScope";
import { canAccessWorkshop, logAdminReadError } from "@/lib/db/adminScope";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TableInsert, TableRow, TableUpdate } from "@/lib/supabase/types";

const workshopInputSchema = z.object({
  address: z.string().trim().max(500).optional().default(""),
  code: z.string().trim().max(40).optional().default(""),
  contactName: z.string().trim().max(160).optional().default(""),
  description: z.string().trim().max(4000).optional().default(""),
  email: z.email().optional().or(z.literal("")).default(""),
  isActive: z.boolean().default(true),
  location: z.string().trim().max(255).optional().default(""),
  name: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(4000).optional().default(""),
  phone: z.string().trim().max(80).optional().default(""),
});

const workshopUpdateSchema = workshopInputSchema.extend({
  id: z.string().uuid(),
});

export type WorkshopInput = z.infer<typeof workshopInputSchema>;
export type WorkshopUpdateInput = z.infer<typeof workshopUpdateSchema>;

export type WorkshopRecord = {
  activeOrders: number;
  address: string;
  code: string;
  completedThisMonth: number;
  contactName: string;
  description?: string;
  email: string;
  employeeCount: number;
  id: string;
  isActive: boolean;
  location: string;
  manager: WorkshopManagerSummary | null;
  name: string;
  notes: string;
  onTimeRate: number;
  phone: string;
};

export type WorkshopManagerSummary = {
  email: string;
  employeeId: string;
  /** The manager accepted the invitation and has signed in. */
  hasSignedIn: boolean;
  name: string;
};

function nullableText(value: string) {
  return value.length > 0 ? value : null;
}

function buildWorkshopCode(workshop: TableRow<"workshops">) {
  const storedCode = workshop.code?.trim();

  if (storedCode) {
    return storedCode;
  }

  return workshop.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("")
    .padEnd(3, "W");
}

function isOrderActive(order: Partial<TableRow<"orders">>) {
  const status = order.status ?? "draft";
  const trackingStatus = order.tracking_status ?? "created";

  return !["delivered", "cancelled", "archived"].includes(String(status)) &&
    !["completed", "cancelled"].includes(String(trackingStatus));
}

function isCompletedOrder(order: Partial<TableRow<"orders">>) {
  const status = order.status ?? "draft";
  const trackingStatus = order.tracking_status ?? "created";

  return ["delivered", "archived"].includes(String(status)) ||
    ["completed", "picked_up", "delivered_to_store"].includes(
      String(trackingStatus)
    );
}

function startedThisMonth(dateValue?: string | null) {
  if (!dateValue) {
    return false;
  }

  const current = new Date();
  const value = new Date(dateValue);

  return (
    value.getUTCFullYear() === current.getUTCFullYear() &&
    value.getUTCMonth() === current.getUTCMonth()
  );
}

function calculateOnTimeRate(orders: Array<Partial<TableRow<"orders">>>) {
  const completed = orders.filter(isCompletedOrder);

  if (completed.length === 0) {
    return 100;
  }

  const onTime = completed.filter((order) => {
    if (!order.due_date || !order.updated_at) {
      return true;
    }

    return new Date(order.updated_at) <= new Date(order.due_date);
  }).length;

  return Math.max(0, Math.min(100, Math.round((onTime / completed.length) * 100)));
}

function toWorkshopInsert(input: WorkshopInput | WorkshopUpdateInput) {
  return {
    address: nullableText(input.address),
    code: nullableText(input.code),
    contact_name: nullableText(input.contactName),
    description: nullableText(input.description),
    email: nullableText(input.email),
    is_active: input.isActive,
    location: nullableText(input.location),
    name: input.name,
    notes: nullableText(input.notes),
    phone: nullableText(input.phone),
  } satisfies TableInsert<"workshops"> | TableUpdate<"workshops">;
}

async function loadWorkshopRows() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    logAdminReadError("workshops", error.message);
    return [];
  }

  return data;
}

async function loadWorkshopOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logAdminReadError("workshop orders", error.message);
    return [];
  }

  return data;
}

async function loadWorkshopEmployees() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    logAdminReadError("workshop employees", error.message);
    return [];
  }

  return data;
}

/** Which of these accounts have signed in at least once. */
export async function loadSignedInProfiles(profileIds: string[]) {
  const result = new Set<string>();
  if (profileIds.length === 0) return result;
  const supabase = createSupabaseAdminClient();
  await Promise.all(
    profileIds.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data.user?.last_sign_in_at) result.add(id);
    })
  );
  return result;
}

export async function getScopedWorkshops(
  viewer: AdminViewer
): Promise<WorkshopRecord[]> {
  if (await isAdminDecoyEnabled()) {
    return getDecoyWorkshops(viewer.role);
  }

  const [workshops, orders, employees] = await Promise.all([
    loadWorkshopRows(),
    loadWorkshopOrders(),
    loadWorkshopEmployees(),
  ]);
  const signedIn = await loadSignedInProfiles(
    workshops
      .map((workshop) => employees.find((employee) => employee.id === workshop.manager_employee_id)?.profile_id)
      .filter((id): id is string => Boolean(id))
  );

  return workshops
    .filter((workshop) => canAccessWorkshop(viewer, workshop.id))
    .map((workshop) => {
      const workshopOrders = orders.filter((order) => order.workshop_id === workshop.id);
      const workshopEmployees = employees.filter(
        (employee) => employee.workshop_id === workshop.id
      );

      const managerRow = employees.find((employee) => employee.id === workshop.manager_employee_id);

      return {
        activeOrders: workshopOrders.filter(isOrderActive).length,
        manager: managerRow
          ? {
              email: managerRow.email ?? "",
              employeeId: managerRow.id,
              hasSignedIn: Boolean(managerRow.profile_id && signedIn.has(managerRow.profile_id)),
              name: managerRow.full_name,
            }
          : null,
        address: workshop.address ?? "",
        code: buildWorkshopCode(workshop),
        completedThisMonth: workshopOrders.filter(
          (order) => isCompletedOrder(order) && startedThisMonth(order.updated_at)
        ).length,
        contactName: workshop.contact_name ?? "",
        description: workshop.description ?? "",
        email: workshop.email ?? "",
        employeeCount: workshopEmployees.filter((employee) => employee.is_active).length,
        id: workshop.id,
        isActive: workshop.is_active,
        location: workshop.location ?? workshop.address ?? "",
        name: workshop.name,
        notes: workshop.notes ?? "",
        onTimeRate: calculateOnTimeRate(workshopOrders),
        phone: workshop.phone ?? "",
      };
    });
}

export async function createWorkshop(input: WorkshopInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = workshopInputSchema.parse(input);
  const { data, error } = await supabase
    .from("workshops")
    .insert(toWorkshopInsert(parsed) as TableInsert<"workshops">)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create workshop: ${error.message}`);
  }

  return data;
}

export async function updateWorkshop(input: WorkshopUpdateInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = workshopUpdateSchema.parse(input);
  const { data, error } = await supabase
    .from("workshops")
    .update(toWorkshopInsert(parsed) as TableUpdate<"workshops">)
    .eq("id", parsed.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update workshop: ${error.message}`);
  }

  return data;
}

export async function setWorkshopActive(workshopId: string, isActive: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workshops")
    .update({ is_active: isActive })
    .eq("id", workshopId)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to update workshop status: ${error.message}`);
  }

  return data;
}

/**
 * Deletes a workshop together with its team. Open orders go back to the
 * office's "not sent yet" list so nothing is lost; the team's logins are
 * switched off.
 */
export async function permanentlyDeleteEmptyWorkshop(workshopId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: workshop, error: workshopError } = await supabase
    .from("workshops")
    .select("id, name")
    .eq("id", workshopId)
    .maybeSingle();
  if (workshopError || !workshop) throw new Error("WORKSHOP_NOT_FOUND");

  // Changing the workshop also clears the employee (database trigger).
  const { error: ordersError } = await supabase
    .from("orders")
    .update({ status: "draft", workshop_id: null })
    .eq("workshop_id", workshopId)
    .not("status", "in", "(delivered,cancelled,archived)");
  if (ordersError) throw new Error("WORKSHOP_DELETE_FAILED");
  const { error: finishedError } = await supabase.from("orders").update({ workshop_id: null }).eq("workshop_id", workshopId);
  if (finishedError) throw new Error("WORKSHOP_DELETE_FAILED");

  const { error: managerError } = await supabase.from("workshops").update({ manager_employee_id: null }).eq("id", workshopId);
  if (managerError) throw new Error("WORKSHOP_DELETE_FAILED");

  const { data: members } = await supabase.from("employees").select("id").eq("workshop_id", workshopId);
  const memberIds = (members ?? []).map((member) => member.id);
  if (memberIds.length > 0) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ employee_id: null, is_active: false, workshop_id: null })
      .in("employee_id", memberIds)
      .eq("role", "employee");
    if (profileError) throw new Error("WORKSHOP_DELETE_FAILED");
    const { error: membersError } = await supabase.from("employees").delete().in("id", memberIds);
    if (membersError) throw new Error("WORKSHOP_DELETE_FAILED");
  }

  await supabase.from("profiles").update({ workshop_id: null }).eq("workshop_id", workshopId);
  const { error: notificationError } = await supabase.from("admin_notifications").delete().eq("workshop_id", workshopId);
  if (notificationError) throw new Error("WORKSHOP_DELETE_FAILED");

  const { data, error } = await supabase.from("workshops").delete().eq("id", workshopId).select("id, name");
  if (error || !data?.length) throw new Error("WORKSHOP_DELETE_FAILED");
  return { ...data[0], memberCount: memberIds.length };
}
