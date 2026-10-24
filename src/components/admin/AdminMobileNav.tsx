"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import type { AppLocale } from "@/i18n/routing";
import { getBrandLogoAlt } from "@/lib/site";
import type { AdminUser } from "@/types/admin";

import { AdminBrand } from "./AdminBrand";
import { AdminLanguageSwitcher } from "./AdminLanguageSwitcher";
import { AdminNavList, AdminUserCard, type AdminNavCounts } from "./AdminSidebar";

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
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Admin");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 transition lg:hidden",
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label={t("buttons.close")}
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.ariaLabel")}
        className={clsx(
          "admin-sidebar absolute inset-y-0 start-0 flex w-[18rem] max-w-[86vw] flex-col px-3 py-4 transition-transform duration-200",
          isOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-3 px-2 pb-3">
          <AdminBrand
            alt={getBrandLogoAlt(locale)}
            subtitle={t("header.adminArea")}
            onClick={onClose}
            logoClassName="h-[2.4rem]"
          />
          <button
            type="button"
            className="admin-icon-button admin-icon-button-quiet"
            onClick={onClose}
            aria-label={t("buttons.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto pb-4">
          <AdminNavList currentUser={currentUser} navCounts={navCounts} onNavigate={onClose} />
        </div>

        <div className="space-y-2">
          <AdminLanguageSwitcher placement="up" />
          <AdminUserCard currentUser={currentUser} onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
