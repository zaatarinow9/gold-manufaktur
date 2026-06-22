"use client";

import clsx from "clsx";
import {
  Gem,
  Home,
  ImageIcon,
  Layers3,
  MessageSquareMore,
  Package,
  Settings2,
  ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { AdminBrand } from "@/components/admin/AdminBrand";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getBrandLogoAlt } from "@/lib/site";
import type { AdminRole, AdminUser } from "@/types/admin";

export type AdminNavKey =
  | "overview"
  | "products"
  | "categories"
  | "gallery"
  | "inquiries"
  | "options"
  | "orders"
  | "settings";

export type AdminNavCounts = Partial<Record<AdminNavKey, number>>;

export type AdminNavItem = {
  href: string;
  icon: LucideIcon;
  key: AdminNavKey;
  roles: AdminRole[];
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin", icon: Home, key: "overview", roles: ["super_admin", "admin"] },
  { href: "/admin/products", icon: Package, key: "products", roles: ["super_admin", "admin"] },
  { href: "/admin/categories", icon: Layers3, key: "categories", roles: ["super_admin", "admin"] },
  { href: "/admin/gallery", icon: ImageIcon, key: "gallery", roles: ["super_admin", "admin"] },
  { href: "/admin/options", icon: Gem, key: "options", roles: ["super_admin", "admin"] },
  { href: "/admin/orders", icon: ShoppingBag, key: "orders", roles: ["super_admin", "admin", "employee"] },
  { href: "/admin/inquiries", icon: MessageSquareMore, key: "inquiries", roles: ["super_admin", "admin"] },
  { href: "/admin/settings", icon: Settings2, key: "settings", roles: ["super_admin", "admin"] },
];

export function getVisibleAdminNavItems(role: AdminRole) {
  return adminNavItems.filter((item) => item.roles.includes(role));
}

export function getAdminNavLabel(key: AdminNavKey, locale: AppLocale) {
  const labels: Record<AppLocale, Record<AdminNavKey, string>> = {
    ar: {
      categories: "التصنيفات",
      gallery: "طلب من الورشة",
      inquiries: "طلبات العملاء",
      options: "الخيارات",
      orders: "الطلبات",
      overview: "لوحة التحكم",
      products: "المنتجات",
      settings: "الإعدادات",
    },
    de: {
      categories: "Kategorien",
      gallery: "Werkstattauftrag",
      inquiries: "Kundenanfragen",
      options: "Optionen",
      orders: "Auftraege",
      overview: "Uebersicht",
      products: "Produkte",
      settings: "Einstellungen",
    },
    en: {
      categories: "Categories",
      gallery: "Workshop Order",
      inquiries: "Customer inquiries",
      options: "Options",
      orders: "Orders",
      overview: "Overview",
      products: "Products",
      settings: "Settings",
    },
    fr: {
      categories: "Categories",
      gallery: "Commande atelier",
      inquiries: "Demandes clients",
      options: "Options",
      orders: "Commandes",
      overview: "Vue d'ensemble",
      products: "Produits",
      settings: "Parametres",
    },
    tr: {
      categories: "Kategoriler",
      gallery: "Atölye Siparişi",
      inquiries: "Müşteri talepleri",
      options: "Seçenekler",
      orders: "Siparişler",
      overview: "Genel bakış",
      products: "Ürünler",
      settings: "Ayarlar",
    },
  };

  return labels[locale][key];
}

type AdminSidebarProps = {
  currentUser: AdminUser;
  navCounts?: AdminNavCounts;
};

export function AdminSidebar({ currentUser, navCounts }: AdminSidebarProps) {
  const pathname = usePathname() ?? "/admin";
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Admin");
  const visibleItems = getVisibleAdminNavItems(currentUser.role);
  const brandLogoAlt = getBrandLogoAlt(locale);

  return (
    <aside className="fixed inset-y-0 start-0 z-20 hidden h-screen w-[17rem] shrink-0 border-e border-white/8 bg-[#070707]/94 lg:flex">
      <div className="flex h-full w-full min-h-0 flex-col px-4 py-4">
        <div className="rounded-[1.1rem] border border-gold/16 bg-[linear-gradient(180deg,rgba(20,16,12,0.96),rgba(8,8,8,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
          <AdminBrand
            alt={brandLogoAlt}
            subtitle={t("header.adminArea")}
            className="w-fit"
            logoClassName="h-[2.95rem]"
          />
        </div>

        <nav className="admin-sidebar-scroll mt-4 flex-1 space-y-1 overflow-y-auto pb-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "admin-nav-link flex items-center gap-3 rounded-[0.95rem] border px-3.5 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "border-gold/22 bg-gold/12 text-foreground shadow-[inset_0_0_0_1px_rgba(232,201,135,0.12)]"
                    : "border-transparent text-muted hover:border-white/8 hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{getAdminNavLabel(item.key, locale)}</span>
                {navCounts?.[item.key] ? (
                  <span className="ms-auto inline-flex min-w-6 items-center justify-center rounded-full bg-gold px-2 py-0.5 text-[0.68rem] font-semibold leading-none text-black">
                    {navCounts[item.key]}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4">
          <div className="rtl-inline-row mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-sm font-semibold text-foreground">
              {currentUser.avatarLabel}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {currentUser.name}
              </p>
              <p className="truncate text-xs text-muted">{currentUser.email}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            {t(`roles.${currentUser.role}`)} {" | "}
            {currentUser.isActive ? t("common.active") : t("common.inactive")}
          </p>
        </div>
      </div>
    </aside>
  );
}
