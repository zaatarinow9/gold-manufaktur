"use client";

import clsx from "clsx";
import { Menu, Phone, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Link, usePathname } from "@/i18n/navigation";
import { type AppLocale } from "@/i18n/routing";
import {
  companyInfo,
  getBrandLogoAlt,
  siteNavigation,
  siteName,
} from "@/lib/site";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";

function isActiveSitePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavbar() {
  const t = useTranslations("Nav");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname() || "/";
  const [openPath, setOpenPath] = useState<string | null>(null);
  const isOpen = openPath === pathname;
  const mobilePanelId = "site-mobile-menu";
  const brandLogoAlt = getBrandLogoAlt(locale);

  const closeMenu = () => setOpenPath(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPath(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(15,11,7,0.86)] backdrop-blur-xl">
        <div className="container-shell">
          <div className="content-shell flex h-[4.5rem] items-center gap-6">
            <Link
              href="/"
              onClick={closeMenu}
              className="brand-logo-link shrink-0"
            >
              <span className="sr-only">{siteName}</span>
              <BrandLogo
                alt={brandLogoAlt}
                priority
                className="h-11 w-auto sm:h-12"
              />
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {siteNavigation.map((link) => {
                const active = isActiveSitePath(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "site-nav-link relative px-3.5 py-2 text-[0.9375rem] transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {t(`links.${link.key}`)}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3.5 -bottom-[1.05rem] h-px bg-gold-soft"
                      />
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="ms-auto flex items-center gap-2">
              <LanguageSwitcher
                key={`${locale}:${pathname}`}
                onNavigate={closeMenu}
                align="end"
              />
              <a
                href={companyInfo.phoneHref}
                className="gold-button hidden !min-h-10 !px-4 !text-sm lg:inline-flex"
              >
                <Phone className="h-4 w-4" />
                {t("call")}
              </a>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] text-gold-soft transition hover:border-gold-soft lg:hidden"
                aria-controls={mobilePanelId}
                aria-expanded={isOpen}
                aria-label={isOpen ? t("closeMenu") : t("openMenu")}
                onClick={() => setOpenPath(isOpen ? null : pathname)}
              >
                {isOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Outside the header: its backdrop blur would otherwise trap this fixed panel. */}
      <MobileMenu
        isOpen={isOpen}
        panelId={mobilePanelId}
        pathname={pathname}
        onClose={closeMenu}
      />
    </>
  );
}
