"use client";

import clsx from "clsx";
import { ArrowUpRight, LogOut, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getBrandLogoAlt } from "@/lib/site";
import type { AdminUser } from "@/types/admin";
import { AdminBrand } from "./AdminBrand";
import { getAdminButtonClassName } from "./AdminButton";
import { AdminLanguageSwitcher } from "./AdminLanguageSwitcher";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { getVisibleAdminNavItems, type AdminNavCounts } from "./AdminSidebar";

type AdminMobileNavProps = {
  currentUser: AdminUser;
  isOpen: boolean;
  navCounts?: AdminNavCounts;
  onClose: () => void;
};

export function AdminMobileNav({
  currentUser,
  isOpen,
  navCounts,
  onClose,
}: AdminMobileNavProps) {
  const pathname = usePathname() ?? "/admin";
  const locale = useLocale() as AppLocale;
  const isRtl = locale === "ar";
  const t = useTranslations("Admin");
  const visibleItems = getVisibleAdminNavItems(currentUser.role);
  const brandLogoAlt = getBrandLogoAlt(locale);

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 bg-black/72 backdrop-blur-sm transition lg:hidden",
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div
        className={clsx(
          "absolute inset-y-0 start-0 flex w-[19rem] max-w-[88vw] flex-col overflow-hidden border-e border-white/8 bg-[#090909] px-4 py-4 shadow-[0_28px_80px_rgba(0,0,0,0.52)] transition",
          isOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <AdminBrand
            alt={brandLogoAlt}
            subtitle={t("header.adminArea")}
            onClick={onClose}
            className="min-w-0"
            logoClassName="h-[2.55rem]"
          />
          <button
            type="button"
            className="admin-icon-button"
            onClick={onClose}
            aria-label={t("buttons.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4">
          <p className="text-sm font-semibold text-foreground">{currentUser.name}</p>
          <p className="mt-1 text-xs text-muted">{currentUser.email}</p>
          <p className="mt-3 text-xs text-muted">
            {t(`roles.${currentUser.role}`)} {" | "}
            {currentUser.isActive ? t("common.active") : t("common.inactive")}
          </p>
        </div>

        <nav className="admin-sidebar-scroll mt-6 flex-1 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  "admin-nav-link flex items-center gap-3 rounded-[0.95rem] border px-3.5 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "border-gold/22 bg-gold/12 text-foreground"
                    : "border-transparent text-muted hover:border-white/8 hover:bg-white/6 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{t(`nav.${item.key}`)}</span>
                {navCounts?.[item.key] ? (
                  <span className="ms-auto inline-flex min-w-6 items-center justify-center rounded-full bg-gold px-2 py-0.5 text-[0.68rem] font-semibold leading-none text-black">
                    {navCounts[item.key]}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 space-y-3">
          <AdminLanguageSwitcher className="w-full" />
          <div className="grid gap-2">
            <Link
              href="/"
              onClick={onClose}
              className={getAdminButtonClassName({ variant: "ghost" })}
            >
              <ArrowUpRight className="h-4 w-4" />
              {t("header.toWebsite")}
            </Link>
            <AdminLogoutButton
              onClick={onClose}
              className={getAdminButtonClassName({ variant: "secondary" })}
            >
              <LogOut className="h-4 w-4" />
              {t("buttons.demoLogin")}
            </AdminLogoutButton>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="absolute inset-0 -z-10 cursor-default"
        aria-hidden
        onClick={onClose}
      />
    </div>
  );
}
