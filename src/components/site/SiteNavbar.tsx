"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { type AppLocale } from "@/i18n/routing";
import { getBrandLogoAlt, siteNavigation, siteName } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";

export function SiteNavbar() {
  const t = useTranslations("Nav");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname() || "/";
  const [isOpen, setIsOpen] = useState(false);
  const mobilePanelId = "site-mobile-menu";
  const languageSwitcherKey = `${locale}:${pathname}`;
  const brandLogoAlt = getBrandLogoAlt(locale);

  const closeMenu = () => setIsOpen(false);

  const isActivePath = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#050505]/72 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(232,201,135,0.4),transparent)]" />
      <div className="container-shell">
        <div className="content-shell">
          <div className="site-navbar-desktop rtl-mirror-grid hidden items-center gap-6 py-4 lg:grid lg:grid-cols-[1fr_auto_1fr]">
            <div className="justify-self-start">
              <LanguageSwitcher
                key={`desktop-${languageSwitcherKey}`}
                onNavigate={closeMenu}
              />
            </div>

            <nav className="flex items-center justify-center gap-1 rounded-full border border-white/10 bg-white/4 px-2 py-2">
              {siteNavigation.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={`site-nav-link rounded-full px-4 py-2 text-sm transition ${
                    isActivePath(link.href)
                      ? "bg-gold/16 text-foreground shadow-[inset_0_0_0_1px_rgba(232,201,135,0.18)]"
                      : "text-muted hover:bg-white/6 hover:text-foreground"
                  }`}
                >
                  {t(`links.${link.key}`)}
                </Link>
              ))}
            </nav>

            <Link href="/" onClick={closeMenu} className="brand-logo-link justify-self-end">
              <span className="sr-only">{siteName}</span>
              <BrandLogo
                alt={brandLogoAlt}
                priority
                className="h-[3rem] w-auto shrink-0 sm:h-[3.35rem]"
              />
            </Link>
          </div>

          <div className="site-navbar-mobile-bar flex items-center justify-between gap-3 py-4 lg:hidden">
            <div className="flex items-center gap-2">
              <LanguageSwitcher
                key={`mobile-${languageSwitcherKey}`}
                onNavigate={closeMenu}
              />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-gold-soft transition hover:border-gold/35 hover:text-foreground"
                aria-controls={mobilePanelId}
                aria-expanded={isOpen}
                aria-label={isOpen ? t("closeMenu") : t("openMenu")}
                onClick={() => setIsOpen((open) => !open)}
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            <Link href="/" onClick={closeMenu} className="brand-logo-link shrink-0">
              <span className="sr-only">{siteName}</span>
              <BrandLogo
                alt={brandLogoAlt}
                priority
                className="h-[2.6rem] w-auto shrink-0 sm:h-[2.9rem]"
              />
            </Link>
          </div>

          <MobileMenu
            isOpen={isOpen}
            panelId={mobilePanelId}
            pathname={pathname}
            onClose={closeMenu}
          />
        </div>
      </div>
    </header>
  );
}
