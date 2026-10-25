"use client";

import clsx from "clsx";
import { MessageCircle, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { companyInfo, legalNavigation, siteNavigation } from "@/lib/site";

type MobileMenuProps = {
  isOpen: boolean;
  panelId: string;
  pathname: string;
  onClose: () => void;
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileMenu({ isOpen, panelId, pathname, onClose }: MobileMenuProps) {
  const t = useTranslations("Nav");
  const tc = useTranslations("Contact.location");

  return (
    <div
      id={panelId}
      hidden={!isOpen}
      className="fixed inset-x-0 bottom-0 top-[4.5rem] z-40 overflow-y-auto border-t border-[var(--border)] bg-background lg:hidden"
    >
      <div className="container-shell">
        <nav className="flex flex-col py-4">
          {siteNavigation.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "mobile-menu-link border-b border-[var(--border)] py-4 font-display text-[1.5rem] font-medium leading-tight transition-colors",
                  active ? "text-gold-soft" : "text-foreground"
                )}
              >
                {t(`links.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        <div className="grid grid-cols-2 gap-3 py-4">
          <a href={companyInfo.phoneHref} className="gold-button">
            <Phone className="h-4 w-4" />
            {t("call")}
          </a>
          <a href={companyInfo.whatsappHref} target="_blank" rel="noopener noreferrer" className="ghost-button">
            <MessageCircle className="h-4 w-4" />
            {tc("whatsappCta")}
          </a>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 py-6 text-sm text-text-soft">
          {legalNavigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={onClose} className="transition-colors hover:text-foreground">
              {t(`links.${item.key}`)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
