"use client";

import clsx from "clsx";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { localeLabels } from "@/lib/site";

import { useDismiss } from "./useDismiss";

type AdminLanguageSwitcherProps = {
  className?: string;
  /** Opens the list upwards (used at the bottom of the mobile drawer). */
  placement?: "down" | "up";
};

export function AdminLanguageSwitcher({
  className,
  placement = "down",
}: AdminLanguageSwitcherProps) {
  const t = useTranslations("Admin");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname() ?? "/admin";
  const searchParams = useSearchParams();
  const query = Object.fromEntries(searchParams.entries());
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setIsOpen(false), []);

  useDismiss(containerRef, isOpen, close);

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        className="admin-button admin-button-ghost admin-button-sm w-full justify-between"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("header.language")}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="inline-flex items-center gap-2">
          <Languages />
          {localeLabels[locale]}
        </span>
        <ChevronDown className={clsx("transition", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className={clsx(
            "admin-menu end-0",
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {routing.locales.map((code) => (
            <Link
              key={code}
              role="menuitemradio"
              aria-checked={code === locale}
              href={{ pathname, query }}
              locale={code}
              lang={code}
              onClick={close}
              className="admin-menu-item"
            >
              <span className="flex-1">{localeLabels[code]}</span>
              {code === locale ? <Check className="!text-gold-soft" /> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
