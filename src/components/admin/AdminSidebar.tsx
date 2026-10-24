"use client";

import {
  BriefcaseBusiness,
  ClipboardList,
  Home,
  Layers3,
  LoaderCircle,
  LogOut,
  MessageSquareMore,
  Package,
  PlusCircle,
  Settings2,
  SlidersHorizontal,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { AdminBrand } from "@/components/admin/AdminBrand";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { canViewAdminSection, type AdminSection } from "@/lib/admin/roleAccess";
import { getBrandLogoAlt } from "@/lib/site";
import type { AdminUser } from "@/types/admin";

import { AdminLogoutButton } from "./AdminLogoutButton";

export type AdminNavKey =
  | "categories"
  | "employees"
  | "gallery"
  | "inquiries"
  | "myTasks"
  | "options"
  | "orders"
  | "overview"
  | "products"
  | "settings"
  | "workshops";

export type AdminNavCounts = Partial<Record<AdminNavKey, number>>;

export type AdminNavGroupKey = "main" | "orders" | "catalog" | "team" | "customers" | "system";

export type AdminNavItem = {
  group: AdminNavGroupKey;
  href: string;
  icon: LucideIcon;
  key: AdminNavKey;
  section: AdminSection;
};

export const adminNavItems: AdminNavItem[] = [
  { group: "main", href: "/admin", icon: Home, key: "overview", section: "overview" },
  { group: "orders", href: "/admin/orders", icon: ClipboardList, key: "orders", section: "orders" },
  { group: "orders", href: "/admin/gallery", icon: PlusCircle, key: "gallery", section: "gallery" },
  { group: "orders", href: "/admin/inquiries", icon: MessageSquareMore, key: "inquiries", section: "inquiries" },
  { group: "orders", href: "/admin/my-tasks", icon: BriefcaseBusiness, key: "myTasks", section: "my_tasks" },
  { group: "catalog", href: "/admin/products", icon: Package, key: "products", section: "products" },
  { group: "catalog", href: "/admin/categories", icon: Layers3, key: "categories", section: "categories" },
  { group: "catalog", href: "/admin/options", icon: SlidersHorizontal, key: "options", section: "options" },
  { group: "team", href: "/admin/employees", icon: Users, key: "employees", section: "employees" },
  { group: "team", href: "/admin/workshops", icon: Wrench, key: "workshops", section: "workshops" },
  { group: "system", href: "/admin/settings", icon: Settings2, key: "settings", section: "settings" },
];

const navGroupOrder: AdminNavGroupKey[] = ["main", "orders", "catalog", "team", "customers", "system"];

export function getVisibleAdminNavItems(role: AdminUser["role"]) {
  return adminNavItems.filter((item) => canViewAdminSection(role, item.section));
}

export function getAdminNavLabelKey(key: AdminNavKey) {
  return `nav.${key}`;
}

export function isAdminNavItemActive(item: AdminNavItem, pathname: string) {
  if (item.href === "/admin") {
    return pathname === "/admin";
  }

  // "New order" lives under /admin/gallery/new-order.
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function findActiveAdminNavItem(role: AdminUser["role"], pathname: string) {
  return getVisibleAdminNavItems(role).find((item) => isAdminNavItemActive(item, pathname)) ?? null;
}

type AdminNavListProps = {
  currentUser: AdminUser;
  navCounts?: AdminNavCounts;
  onNavigate?: () => void;
};

export function AdminNavList({ currentUser, navCounts, onNavigate }: AdminNavListProps) {
  const pathname = usePathname() ?? "/admin";
  const t = useTranslations("Admin");
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const visibleItems = getVisibleAdminNavItems(currentUser.role);

  return (
    <nav aria-label={t("nav.ariaLabel")} className="space-y-0.5">
      {navGroupOrder.map((group) => {
        const items = visibleItems.filter((item) => item.group === group);

        if (items.length === 0) {
          return null;
        }

        return (
          <div key={group} role="group" aria-labelledby={group === "main" ? undefined : `admin-nav-${group}`}>
            {group !== "main" ? (
              <p id={`admin-nav-${group}`} className="admin-nav-group-label">
                {t(`navGroups.${group}`)}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = isAdminNavItemActive(item, pathname);
                const isPending = pendingHref === item.href && !isActive;
                const count = navCounts?.[item.key];

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    aria-busy={isPending || undefined}
                    onClick={() => {
                      if (!isActive) setPendingHref(item.href);
                      onNavigate?.();
                    }}
                    className="admin-nav-link"
                  >
                    {isPending ? <LoaderCircle className="animate-spin text-gold" /> : <Icon />}
                    <span className="truncate">{t(getAdminNavLabelKey(item.key))}</span>
                    {count ? (
                      <span className="admin-nav-count" aria-label={t("nav.countLabel", { count })}>
                        {count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminUserCard({ currentUser, onNavigate }: { currentUser: AdminUser; onNavigate?: () => void }) {
  const t = useTranslations("Admin");

  return (
    <div className="flex items-center gap-3 rounded-[0.75rem] border border-white/8 bg-white/[0.03] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold-soft">
        {currentUser.avatarLabel}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{currentUser.name}</p>
        <p className="truncate text-xs text-muted">{t(`roles.${currentUser.role}`)}</p>
      </div>
      <AdminLogoutButton
        className="admin-icon-button admin-icon-button-quiet"
        onClick={onNavigate}
        ariaLabel={t("buttons.logout")}
      >
        <LogOut className="h-4 w-4" />
      </AdminLogoutButton>
    </div>
  );
}

type AdminSidebarProps = {
  currentUser: AdminUser;
  navCounts?: AdminNavCounts;
};

export function AdminSidebar({ currentUser, navCounts }: AdminSidebarProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Admin");

  return (
    <aside className="admin-sidebar fixed inset-y-0 start-0 z-20 hidden w-[16.5rem] lg:flex">
      <div className="flex h-full min-h-0 w-full flex-col px-3 py-4">
        <div className="px-2 pb-3">
          <AdminBrand
            alt={getBrandLogoAlt(locale)}
            subtitle={t("header.adminArea")}
            logoClassName="h-[2.6rem]"
          />
        </div>

        <div className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto pb-4">
          <AdminNavList currentUser={currentUser} navCounts={navCounts} />
        </div>

        <AdminUserCard currentUser={currentUser} />
      </div>
    </aside>
  );
}
