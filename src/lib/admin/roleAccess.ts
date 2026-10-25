import type { AppLocale } from "@/i18n/routing";
import type { AdminRole } from "@/types/admin";

export const adminRoles = ["super_admin", "admin", "employee", "marketing", "customer_service"] as const;

export type AdminSection =
  | "archive"
  | "attendance"
  | "categories"
  | "employees"
  | "gallery"
  | "inquiries"
  | "messages"
  | "my_tasks"
  | "options"
  | "orders"
  | "overview"
  | "products"
  | "reports"
  | "settings"
  | "system_check"
  | "team"
  | "workshop_orders"
  | "workshops";

const sectionAccess: Record<AdminSection, AdminRole[]> = {
  archive: ["super_admin"],
  attendance: ["super_admin"],
  categories: ["super_admin", "marketing"],
  employees: ["super_admin", "admin"],
  gallery: ["super_admin", "admin", "customer_service"],
  inquiries: ["super_admin", "customer_service"],
  messages: ["super_admin", "employee"],
  my_tasks: ["employee"],
  options: ["super_admin", "marketing"],
  orders: ["super_admin", "admin", "customer_service"],
  overview: ["super_admin", "admin"],
  products: ["super_admin", "marketing"],
  reports: ["super_admin"],
  settings: ["super_admin", "marketing"],
  system_check: ["super_admin"],
  team: ["employee"],
  workshop_orders: ["employee"],
  workshops: ["super_admin"],
};

/** Sections only a workshop manager sees, and those only plain staff see. */
const managerOnly: AdminSection[] = ["team", "workshop_orders"];
const staffOnly: AdminSection[] = ["my_tasks"];

type SectionViewer = { managedWorkshopId?: string; role: AdminRole };

export function isAdminRole(value: string | null | undefined): value is AdminRole {
  return adminRoles.includes(value as AdminRole);
}

export function canViewAdminSection(viewer: SectionViewer, section: AdminSection) {
  if (!sectionAccess[section].includes(viewer.role)) return false;
  if (viewer.role !== "employee") return true;
  const isManager = Boolean(viewer.managedWorkshopId);
  if (managerOnly.includes(section)) return isManager;
  if (staffOnly.includes(section)) return !isManager;
  return true;
}

export function getPostLoginRedirectForRole(locale: AppLocale, role: AdminRole, isWorkshopManager = false) {
  if (role === "employee") {
    return isWorkshopManager ? `/${locale}/admin/workshop-orders` : `/${locale}/admin/my-tasks`;
  }

  if (role === "admin") {
    return `/${locale}/admin/orders`;
  }

  if (role === "marketing") {
    return `/${locale}/admin/products`;
  }

  if (role === "customer_service") {
    return `/${locale}/admin/inquiries`;
  }

  return `/${locale}/admin`;
}

export const getRoleDashboardPath = getPostLoginRedirectForRole;
