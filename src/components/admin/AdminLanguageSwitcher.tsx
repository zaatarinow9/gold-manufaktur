"use client";

import clsx from "clsx";
import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Link, usePathname } from "@/i18n/navigation";

const adminLocales = [
  { code: "de", label: "Deutsch" },
  { code: "ar", label: "العربية" },
] as const;

type AdminLanguageSwitcherProps = {
  className?: string;
};

export function AdminLanguageSwitcher({
  className,
}: AdminLanguageSwitcherProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const pathname = usePathname() ?? "/admin";
  const searchParams = useSearchParams();
  const query = Object.fromEntries(searchParams.entries());

  return (
    <div
      className={clsx(
        "admin-language-switcher inline-flex flex-wrap items-center gap-1 rounded-[0.95rem] border border-white/8 bg-white/4 p-1",
        isRtl && "flex-row-reverse",
        className
      )}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] text-gold-soft">
        <Languages className="h-4 w-4" />
      </span>
      {adminLocales.map((entry) => {
        const isActive = entry.code === locale;

        return (
          <Link
            key={entry.code}
            href={{ pathname, query }}
            locale={entry.code}
            className={clsx(
              "inline-flex min-h-9 items-center rounded-[0.8rem] px-3 text-sm font-medium transition",
              isActive
                ? "bg-gold text-[#140d07] shadow-[0_14px_28px_rgba(196,154,82,0.18)]"
                : "text-muted hover:bg-white/8 hover:text-foreground"
            )}
          >
            {entry.label}
          </Link>
        );
      })}
    </div>
  );
}
