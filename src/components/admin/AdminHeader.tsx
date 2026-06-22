"use client";

import { ArrowUpRight, LogOut, Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getAdminPrivacyUiCopy } from "@/lib/admin/privacy";
import { getBrandLogoAlt } from "@/lib/site";
import type { AdminUser } from "@/types/admin";
import { AdminBrand } from "./AdminBrand";
import { AdminBadge } from "./AdminBadge";
import { getAdminButtonClassName } from "./AdminButton";
import { AdminLanguageSwitcher } from "./AdminLanguageSwitcher";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { useAdminPrivacyMode } from "./AdminPrivacyMode";
import {
  adminNavItems,
  getAdminNavLabel,
  getVisibleAdminNavItems,
  type AdminNavCounts,
} from "./AdminSidebar";

type AdminHeaderProps = {
  currentUser: AdminUser;
  navCounts?: AdminNavCounts;
  onOpenNav: () => void;
};

export function AdminHeader({
  currentUser,
  navCounts,
  onOpenNav,
}: AdminHeaderProps) {
  const pathname = usePathname() ?? "/admin";
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Admin");
  const { enabled: privacyModeEnabled } = useAdminPrivacyMode();
  const privacyCopy = getAdminPrivacyUiCopy(locale);
  const visibleItems = getVisibleAdminNavItems(currentUser.role);
  const currentItem =
    visibleItems.find((item) =>
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname === item.href || pathname.startsWith(`${item.href}/`)
    ) ?? visibleItems[0] ?? adminNavItems[0];
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const brandLogoAlt = getBrandLogoAlt(locale);

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#070707]/90 backdrop-blur-xl">
      <div className="admin-header-bar flex min-h-[4.5rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenNav}
            className="admin-icon-button lg:hidden"
            aria-label={t("buttons.openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <AdminBrand alt={brandLogoAlt} className="shrink-0" logoClassName="h-[2.35rem]" />
          <div className="min-w-0 space-y-1">
            <div className="rtl-inline-row flex flex-wrap items-center gap-2">
              <AdminBadge
                variant="gold"
                className="px-2 py-0.5 text-[0.62rem] tracking-[0.08em]"
              >
                {t(`roles.${currentUser.role}`)}
              </AdminBadge>
              {privacyModeEnabled ? (
                <AdminBadge variant="danger" className="px-2 py-0.5 text-[0.68rem]">
                  {privacyCopy.activeBadge}
                </AdminBadge>
              ) : null}
              <p className="truncate text-sm font-semibold text-foreground">
                {getAdminNavLabel(currentItem.key, locale)}
              </p>
              {navCounts?.[currentItem.key] ? (
                <AdminBadge variant="danger" className="px-2 py-0.5 text-[0.68rem]">
                  {navCounts[currentItem.key]}
                </AdminBadge>
              ) : null}
            </div>
            <div className="rtl-inline-row flex flex-wrap items-center gap-3 text-sm text-muted">
              <span>{currentUser.name}</span>
              <span>{dateLabel}</span>
            </div>
          </div>
        </div>

        <div className="rtl-inline-row flex flex-wrap items-center gap-2">
          <AdminLanguageSwitcher />
          <Link
            href="/"
            className={getAdminButtonClassName({ size: "sm", variant: "ghost" })}
          >
            <ArrowUpRight className="h-4 w-4" />
            {t("header.toWebsite")}
          </Link>
          <AdminLogoutButton
            className={getAdminButtonClassName({
              size: "sm",
              variant: "secondary",
            })}
          >
            <LogOut className="h-4 w-4" />
            {t("buttons.demoLogin")}
          </AdminLogoutButton>
        </div>
      </div>
    </header>
  );
}
