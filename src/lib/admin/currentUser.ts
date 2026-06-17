import {
  adminOrders,
  adminUsers,
  attendanceRecords,
  employees,
  managedProducts,
  workshops,
} from "@/data/adminMock";
import type {
  AdminProduct,
  AdminRole,
  AdminUser,
  AttendanceRecord,
  Employee,
  Workshop,
  WorkshopOrder,
} from "@/types/admin";

// Demo role switch for UI testing until Supabase Auth and policies are integrated.
export const MOCK_ADMIN_ROLE: AdminRole = "super_admin";
let currentAdminUserOverride: AdminUser | null = null;

const rolePriority: Record<AdminRole, number> = {
  super_admin: 3,
  admin: 2,
  employee: 1,
};

export function getCurrentAdminUser(role: AdminRole = MOCK_ADMIN_ROLE): AdminUser {
  if (currentAdminUserOverride) {
    return currentAdminUserOverride;
  }

  return (
    adminUsers.find((user) => user.role === role) ??
    adminUsers.find((user) => user.role === "super_admin") ??
    adminUsers[0]
  );
}

export function setCurrentAdminUser(user: AdminUser | null) {
  currentAdminUserOverride = user;
}

export function hasAdminRoleAccess(
  user: AdminUser,
  allowedRoles: AdminRole[]
) {
  return allowedRoles.includes(user.role);
}

export function hasMinimumAdminRole(user: AdminUser, role: AdminRole) {
  return rolePriority[user.role] >= rolePriority[role];
}

export function getCurrentWorkshop(user: AdminUser) {
  return workshops.find((workshop) => workshop.id === user.workshopId);
}

export function scopeOrdersForUser(
  user: AdminUser,
  orders: WorkshopOrder[] = adminOrders
) {
  if (user.role === "super_admin") {
    return orders;
  }

  if (user.role === "admin") {
    return orders.filter((order) => order.workshopId === user.workshopId);
  }

  return orders.filter((order) => order.assignedEmployeeId === user.linkedEmployeeId);
}

export function scopeWorkshopsForUser(
  user: AdminUser,
  workshopList: Workshop[] = workshops
) {
  if (user.role === "super_admin") {
    return workshopList;
  }

  return workshopList.filter((workshop) => workshop.id === user.workshopId);
}

export function scopeEmployeesForUser(
  user: AdminUser,
  employeeList: Employee[] = employees
) {
  if (user.role === "super_admin") {
    return employeeList;
  }

  return employeeList.filter((employee) => employee.workshopId === user.workshopId);
}

export function scopeAttendanceForUser(
  user: AdminUser,
  records: AttendanceRecord[] = attendanceRecords
) {
  if (user.role === "super_admin") {
    return records;
  }

  const visibleEmployees = new Set(
    scopeEmployeesForUser(user).map((employee) => employee.id)
  );

  return records.filter((record) => visibleEmployees.has(record.employeeId));
}

export function scopeProductsForUser(
  user: AdminUser,
  products: AdminProduct[] = managedProducts
) {
  if (user.role === "employee") {
    return products.filter((product) =>
      scopeOrdersForUser(user).some((order) =>
        order.items.some((item) => item.productId === product.id)
      )
    );
  }

  return products;
}

export function getAssignedEmployeeName(
  employeeId?: string,
  employeeList: Employee[] = employees
) {
  if (!employeeId) {
    return null;
  }

  return employeeList.find((employee) => employee.id === employeeId)?.name ?? null;
}
