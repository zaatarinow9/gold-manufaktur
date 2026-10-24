"use client";

import { usePathname } from "@/i18n/navigation";

type LocaleChromeProps = {
  children: React.ReactNode;
  footer: React.ReactNode;
  navbar: React.ReactNode;
};

export function LocaleChrome({ children, footer, navbar }: LocaleChromeProps) {
  const pathname = usePathname() ?? "/";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return children;
  }

  return (
    <div className="site-shell">
      {navbar}
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  );
}
