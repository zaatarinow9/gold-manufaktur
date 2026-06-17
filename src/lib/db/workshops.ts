import "server-only";

import { z } from "zod";

import type { AdminViewer } from "@/lib/db/adminScope";
import { canAccessWorkshop, logAdminReadError } from "@/lib/db/adminScope";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TableInsert, TableRow, TableUpdate } from "@/lib/supabase/types";

const workshopInputSchema = z.object({
  address: z.string().trim().max(500).optional().default(""),
  code: z.string().trim().max(40).optional().default(""),
  contactName: z.string().trim().max(160).optional().default(""),
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
  email: string;
  employeeCount: number;
  id: string;
  isActive: boolean;
  location: string;
  name: string;
  notes: string;
  onTimeRate: number;
  phone: string;
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

export async function getScopedWorkshops(
  viewer: AdminViewer
): Promise<WorkshopRecord[]> {
  const [workshops, orders, employees] = await Promise.all([
    loadWorkshopRows(),
    loadWorkshopOrders(),
    loadWorkshopEmployees(),
  ]);

  return workshops
    .filter((workshop) => canAccessWorkshop(viewer, workshop.id))
    .map((workshop) => {
      const workshopOrders = orders.filter((order) => order.workshop_id === workshop.id);
      const workshopEmployees = employees.filter(
        (employee) => employee.workshop_id === workshop.id
      );

      return {
        activeOrders: workshopOrders.filter(isOrderActive).length,
        address: workshop.address ?? "",
        code: buildWorkshopCode(workshop),
        completedThisMonth: workshopOrders.filter(
          (order) => isCompletedOrder(order) && startedThisMonth(order.updated_at)
        ).length,
        contactName: workshop.contact_name ?? "",
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
