import type { AppLocale } from "@/i18n/routing";
import type { AdminRole } from "@/types/admin";

export type AdminSection =
  | "archive"
  | "attendance"
  | "categories"
  | "employees"
  | "gallery"
  | "inquiries"
  | "my_tasks"
  | "options"
  | "orders"
  | "overview"
  | "products"
  | "reports"
  | "settings"
  | "system_check"
  | "workshops";

const sectionAccess: Record<AdminSection, AdminRole[]> = {
  archive: ["super_admin"],
  attendance: ["super_admin"],
  categories: ["super_admin"],
  employees: ["super_admin", "admin"],
  gallery: ["super_admin", "admin"],
  inquiries: ["super_admin"],
  my_tasks: ["employee"],
  options: ["super_admin"],
  orders: ["super_admin", "admin"],
  overview: ["super_admin", "admin"],
  products: ["super_admin"],
  reports: ["super_admin"],
  settings: ["super_admin"],
  system_check: ["super_admin"],
  workshops: ["super_admin"],
};

export function canViewAdminSection(role: AdminRole, section: AdminSection) {
  return sectionAccess[section].includes(role);
}

export function getRoleDashboardPath(locale: AppLocale, role: AdminRole) {
  return role === "employee" ? `/${locale}/admin/my-tasks` : `/${locale}/admin`;
}
