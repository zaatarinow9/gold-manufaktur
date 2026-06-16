"use client";

import clsx from "clsx";
import { ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { type AppLocale, routing } from "@/i18n/routing";
import { localeLabels } from "@/lib/site";

type LanguageSwitcherProps = {
  align?: "end" | "start";
  className?: string;
  onNavigate?: () => void;
};

export function LanguageSwitcher({
  align = "start",
  className,
  onNavigate,
}: LanguageSwitcherProps) {
  const t = useTranslations("Nav");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname() || "/";
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isRtl = locale === "ar";

  useEffect(() => {
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
  }, []);

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("language")}
        className={clsx(
          "language-switcher-trigger inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3.5 text-sm font-medium text-foreground transition hover:border-gold/35 hover:bg-white/10",
          isRtl && "flex-row-reverse"
        )}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Globe className="h-4 w-4 text-gold-soft" />
        <span className="truncate">{localeLabels[locale]}</span>
        <ChevronDown
          className={clsx(
            "h-4 w-4 text-muted transition",
            isOpen ? "rotate-180" : ""
          )}
        />
      </button>

      <div
        className={clsx(
          "absolute top-full z-50 mt-3 min-w-44 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,11,0.96),rgba(8,8,8,0.98))] p-2 shadow-[0_28px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl transition duration-200",
          align === "end" ? "end-0" : "start-0",
          "text-start",
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        )}
        role="menu"
      >
        {routing.locales.map((entry) => (
          <Link
            key={entry}
            href={pathname}
            locale={entry}
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onNavigate?.();
            }}
            className={clsx(
              "language-switcher-option flex items-center justify-between rounded-[18px] px-4 py-3 text-sm transition",
              isRtl && "flex-row-reverse",
              entry === locale
                ? "bg-gold text-[#140d07]"
                : "text-muted hover:bg-white/8 hover:text-foreground"
            )}
          >
            <span>{localeLabels[entry]}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
