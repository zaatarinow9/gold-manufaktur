"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { siteNavigation } from "@/lib/site";

type MobileMenuProps = {
  isOpen: boolean;
  panelId: string;
  pathname: string;
  onClose: () => void;
};

export function MobileMenu({
  isOpen,
  panelId,
  pathname,
  onClose,
}: MobileMenuProps) {
  const t = useTranslations("Nav.links");

  const isActivePath = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div
      id={panelId}
      className={clsx(
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 lg:hidden",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="min-h-0">
        <div className="mt-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,11,0.94),rgba(8,8,8,0.98))] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.38)]">
          <nav className="flex flex-col gap-1">
            {siteNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  "mobile-menu-link rounded-[20px] px-4 py-3 text-start text-sm transition",
                  isActivePath(item.href)
                    ? "bg-gold text-[#140d07]"
                    : "text-muted hover:bg-white/6 hover:text-foreground"
                )}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
