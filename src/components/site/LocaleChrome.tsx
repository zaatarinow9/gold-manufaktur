"use client";

import { usePathname } from "@/i18n/navigation";

type LocaleChromeProps = {
  children: React.ReactNode;
  footer: React.ReactNode;
  navbar: React.ReactNode;
};

export function LocaleChrome({
  children,
  footer,
  navbar,
}: LocaleChromeProps) {
  const pathname = usePathname() ?? "/";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return children;
  }

  return (
    <div className="site-shell">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(196,154,82,0.16),transparent_60%)]" />
      {navbar}
      <main className="flex-1 pb-24">{children}</main>
      {footer}
    </div>
  );
}
