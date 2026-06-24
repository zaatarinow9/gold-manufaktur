import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminUser } from "@/types/admin";

import { getAdminSessionContext } from "./auth";
export {
  canViewAdminSection,
  getRoleDashboardPath,
  type AdminSection,
} from "./roleAccess";

export async function getCurrentAdminUser() {
  const context = await getAdminSessionContext();
  return context.state === "authenticated" ? context.user : null;
}

export async function assertSuperAdmin() {
  const user = await getCurrentAdminUser();

  if (!user || user.role !== "super_admin") {
    throw new Error("ADMIN_ACCESS_DENIED");
  }

  return user;
}

export async function assertAdminOrSuperAdmin() {
  const user = await getCurrentAdminUser();

  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    throw new Error("ADMIN_ACCESS_DENIED");
  }

  return user;
}

export async function assertEmployeeAssignedToOrder(
  user: Pick<AdminUser, "id" | "linkedEmployeeId" | "role">,
  orderId: string
) {
  if (user.role !== "employee" || !user.linkedEmployeeId) {
    throw new Error("ORDER_ASSIGNMENT_FORBIDDEN");
  }

  const supabase = createSupabaseAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("employee_id")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.employee_id !== user.linkedEmployeeId) {
    throw new Error("ORDER_ASSIGNMENT_FORBIDDEN");
  }

  return order;
}
