import "server-only";

import { z } from "zod";

import type { AdminViewer } from "@/lib/db/adminScope";
import { canAccessEmployee, logAdminReadError } from "@/lib/db/adminScope";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TableInsert, TableUpdate } from "@/lib/supabase/types";

const employeeInputSchema = z.object({
  attendanceStatus: z
    .enum(["present", "absent", "vacation", "sick", "late"])
    .default("present"),
  email: z.email().optional().or(z.literal("")).default(""),
  fullName: z.string().trim().min(1).max(160),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(4000).optional().default(""),
  phone: z.string().trim().max(80).optional().default(""),
  profileId: z.string().uuid().optional().or(z.literal("")).default(""),
  role: z.enum(["admin", "employee"]).default("employee"),
  shiftLabel: z.string().trim().max(120).optional().default(""),
  workshopId: z.string().uuid(),
});

const employeeUpdateSchema = employeeInputSchema.extend({
  id: z.string().uuid(),
});

export type EmployeeInput = z.infer<typeof employeeInputSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

export type EmployeeRecord = {
  attendanceStatus: "present" | "absent" | "vacation" | "sick" | "late";
  assignedOrderCount: number;
  email: string;
  fullName: string;
  id: string;
  isActive: boolean;
  notes: string;
  phone: string;
  profileId: string | null;
  role: "admin" | "employee";
  shiftLabel: string;
  workshopId: string;
  workshopName: string;
};

function nullableText(value: string) {
  return value.length > 0 ? value : null;
}

function toEmployeeInsert(input: EmployeeInput | EmployeeUpdateInput) {
  return {
    attendance_status: input.attendanceStatus,
    email: nullableText(input.email),
    full_name: input.fullName,
    is_active: input.isActive,
    notes: nullableText(input.notes),
    phone: nullableText(input.phone),
    profile_id: nullableText(input.profileId),
    role: input.role,
    shift_label: nullableText(input.shiftLabel),
    workshop_id: input.workshopId,
  } satisfies TableInsert<"employees"> | TableUpdate<"employees">;
}

async function loadEmployeeRows() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    logAdminReadError("employees", error.message);
    return [];
  }

  return data;
}

async function loadEmployeeOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logAdminReadError("employee orders", error.message);
    return [];
  }

  return data;
}

async function loadWorkshopsById() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workshops")
    .select("*");

  if (error) {
    logAdminReadError("employee workshops", error.message);
    return new Map<string, { name: string }>();
  }

  return new Map(data.map((workshop) => [workshop.id, { name: workshop.name }]));
}

export async function getScopedEmployees(
  viewer: AdminViewer
): Promise<EmployeeRecord[]> {
  const [employees, orders, workshopMap] = await Promise.all([
    loadEmployeeRows(),
    loadEmployeeOrders(),
    loadWorkshopsById(),
  ]);

  return employees
    .filter((employee) =>
      canAccessEmployee(viewer, employee.id, employee.workshop_id)
    )
    .map((employee) => ({
      attendanceStatus: employee.attendance_status,
      assignedOrderCount: orders.filter((order) => order.employee_id === employee.id).length,
      email: employee.email ?? "",
      fullName: employee.full_name,
      id: employee.id,
      isActive: employee.is_active,
      notes: employee.notes ?? "",
      phone: employee.phone ?? "",
      profileId: employee.profile_id,
      role: employee.role,
      shiftLabel: employee.shift_label ?? "",
      workshopId: employee.workshop_id ?? "",
      workshopName: workshopMap.get(employee.workshop_id ?? "")?.name ?? "",
    }));
}

export async function createEmployee(input: EmployeeInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = employeeInputSchema.parse(input);
  const { data, error } = await supabase
    .from("employees")
    .insert(toEmployeeInsert(parsed) as TableInsert<"employees">)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create employee: ${error.message}`);
  }

  return data;
}

export async function updateEmployee(input: EmployeeUpdateInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = employeeUpdateSchema.parse(input);
  const { data, error } = await supabase
    .from("employees")
    .update(toEmployeeInsert(parsed) as TableUpdate<"employees">)
    .eq("id", parsed.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update employee: ${error.message}`);
  }

  return data;
}

export async function setEmployeeActive(employeeId: string, isActive: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .update({ is_active: isActive })
    .eq("id", employeeId)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to update employee status: ${error.message}`);
  }

  return data;
}
