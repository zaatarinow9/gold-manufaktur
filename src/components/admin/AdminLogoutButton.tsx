"use client";

import { useLocale } from "next-intl";

import { logoutAction } from "@/app/[locale]/admin/login/actions";
import type { AppLocale } from "@/i18n/routing";

type AdminLogoutButtonProps = {
  ariaLabel?: string;
  children: React.ReactNode;
  className: string;
  onClick?: () => void;
};

export function AdminLogoutButton({
  ariaLabel,
  children,
  className,
  onClick,
}: AdminLogoutButtonProps) {
  const locale = useLocale() as AppLocale;
  const action = logoutAction.bind(null, locale);

  return (
    <form action={action}>
      <button
        type="submit"
        className={className}
        onClick={onClick}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {children}
      </button>
    </form>
  );
}
