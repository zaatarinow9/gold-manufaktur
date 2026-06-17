import "server-only";

import type { AdminUser } from "@/types/admin";

export type AdminViewer = Pick<
  AdminUser,
  "email" | "id" | "isActive" | "linkedEmployeeId" | "name" | "role" | "workshopId"
>;

type WithWorkshopId = {
  workshopId?: string | null;
};

type WithEmployeeId = {
  employeeId?: string | null;
};

type WithAssignedAdminId = {
  assignedAdminId?: string | null;
};

export function logAdminReadError(scope: string, message: string) {
  console.error(`[admin-db] ${scope}: ${message}`);
}

export function canAccessWorkshop(
  viewer: AdminViewer,
  workshopId?: string | null
) {
  if (viewer.role === "super_admin") {
    return true;
  }

  if (!viewer.workshopId || !workshopId) {
    return false;
  }

  return viewer.workshopId === workshopId;
}

export function canAccessEmployee(
  viewer: AdminViewer,
  employeeId?: string | null,
  workshopId?: string | null
) {
  if (viewer.role === "super_admin") {
    return true;
  }

  if (viewer.role === "admin") {
    return canAccessWorkshop(viewer, workshopId);
  }

  if (!viewer.linkedEmployeeId) {
    return canAccessWorkshop(viewer, workshopId);
  }

  return viewer.linkedEmployeeId === employeeId;
}

export function canAccessOrder(
  viewer: AdminViewer,
  order: WithWorkshopId & WithEmployeeId & WithAssignedAdminId
) {
  if (viewer.role === "super_admin") {
    return true;
  }

  if (
    viewer.role === "admin" &&
    order.assignedAdminId &&
    order.assignedAdminId === viewer.id
  ) {
    return true;
  }

  return canAccessEmployee(viewer, order.employeeId, order.workshopId);
}

export function scopeWorkshopsForViewer<T extends WithWorkshopId>(
  viewer: AdminViewer,
  workshops: T[]
) {
  if (viewer.role === "super_admin") {
    return workshops;
  }

  return workshops.filter((workshop) => canAccessWorkshop(viewer, workshop.workshopId));
}

export function scopeEmployeesForViewer<
  T extends WithEmployeeId & WithWorkshopId,
>(viewer: AdminViewer, employees: T[]) {
  if (viewer.role === "super_admin") {
    return employees;
  }

  return employees.filter((employee) =>
    canAccessEmployee(viewer, employee.employeeId, employee.workshopId)
  );
}

export function scopeOrdersForViewer<
  T extends WithEmployeeId & WithWorkshopId & WithAssignedAdminId,
>(
  viewer: AdminViewer,
  orders: T[]
) {
  if (viewer.role === "super_admin") {
    return orders;
  }

  return orders.filter((order) => canAccessOrder(viewer, order));
}

export function makeWorkshopScopedId(
  rawId: string | null | undefined,
  fallbackPrefix: string
) {
  if (rawId && rawId.trim().length > 0) {
    return rawId;
  }

  return `${fallbackPrefix}-${crypto.randomUUID()}`;
}
