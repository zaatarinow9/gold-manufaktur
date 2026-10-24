"use client";

import { ExternalLink, Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getBrandLogoAlt } from "@/lib/site";
import type { AdminUser } from "@/types/admin";

import { AdminBrand } from "./AdminBrand";
import { AdminLanguageSwitcher } from "./AdminLanguageSwitcher";
import {
  findActiveAdminNavItem,
  getAdminNavLabelKey,
  type AdminNavCounts,
} from "./AdminSidebar";

type AdminHeaderProps = {
  currentUser: AdminUser;
  navCounts?: AdminNavCounts;
  onOpenNav: () => void;
};

export function AdminHeader({ currentUser, onOpenNav }: AdminHeaderProps) {
  const pathname = usePathname() ?? "/admin";
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Admin");
  const currentItem = findActiveAdminNavItem(currentUser.role, pathname);

  return (
    <header className="admin-topbar sticky top-0 z-30">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenNav}
          className="admin-icon-button admin-icon-button-quiet lg:hidden"
          aria-label={t("buttons.openMenu")}
        >
          <Menu className="h-5 w-5" />
        </button>
        <AdminBrand
          alt={getBrandLogoAlt(locale)}
          className="shrink-0 lg:hidden"
          logoClassName="h-8"
        />
        <p className="hidden min-w-0 truncate text-sm font-medium text-muted lg:block">
          {currentItem ? t(getAdminNavLabelKey(currentItem.key)) : t("header.adminArea")}
        </p>

        <div className="ms-auto flex items-center gap-1.5">
          <AdminLanguageSwitcher className="hidden sm:block" />
          <Link
            href="/"
            target="_blank"
            className="admin-button admin-button-ghost admin-button-sm"
            aria-label={t("header.toWebsite")}
          >
            <ExternalLink />
            <span className="hidden md:inline">{t("header.toWebsite")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
