"use client";

import clsx from "clsx";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { type AppLocale, routing } from "@/i18n/routing";
import { localeLabels } from "@/lib/site";

type LanguageSwitcherProps = {
  align?: "end" | "start";
  className?: string;
  onNavigate?: () => void;
};

export function LanguageSwitcher({ align = "start", className, onNavigate }: LanguageSwitcherProps) {
  const t = useTranslations("Nav");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const query = Object.fromEntries(searchParams.entries());

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("language")}
        className="language-switcher-trigger inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-3.5 text-sm font-medium text-foreground transition hover:border-gold-soft"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Globe className="h-4 w-4 text-gold-soft" />
        <span>{localeLabels[locale]}</span>
        <ChevronDown className={clsx("h-4 w-4 text-muted transition", isOpen && "rotate-180")} />
      </button>

      <div
        role="menu"
        hidden={!isOpen}
        className={clsx(
          "absolute top-full z-50 mt-2 min-w-48 rounded-[14px] border border-[var(--border)] bg-surface-strong p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.5)]",
          align === "end" ? "end-0" : "start-0"
        )}
      >
        {routing.locales.map((entry) => {
          const active = entry === locale;

          return (
            <Link
              key={entry}
              href={{ pathname, query }}
              locale={entry}
              role="menuitem"
              lang={entry}
              aria-current={active ? "true" : undefined}
              onClick={() => {
                setIsOpen(false);
                onNavigate?.();
              }}
              className={clsx(
                "language-switcher-option flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5 text-sm transition-colors",
                active ? "text-gold-soft" : "text-muted hover:bg-white/[0.05] hover:text-foreground"
              )}
            >
              <span>{localeLabels[entry]}</span>
              {active ? <Check className="h-4 w-4" /> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
