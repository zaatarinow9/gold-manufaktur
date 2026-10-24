"use client";

import { useCallback, useState } from "react";

import { usePathname } from "@/i18n/navigation";
import type { AdminUser } from "@/types/admin";

import { AdminHeader } from "./AdminHeader";
import { AdminMobileNav } from "./AdminMobileNav";
import { AdminPrivacyProvider } from "./AdminPrivacyMode";
import { AdminSidebar, type AdminNavCounts } from "./AdminSidebar";

type AdminShellProps = {
  children: React.ReactNode;
  currentUser: AdminUser;
  navCounts?: AdminNavCounts;
};

export function AdminShell({
  children,
  currentUser,
  navCounts,
}: AdminShellProps) {
  const pathname = usePathname() ?? "/admin";
  const isStandaloneRoute =
    pathname === "/admin/login" || pathname.startsWith("/admin/auth/");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);

  if (isStandaloneRoute || currentUser.id === "guest") {
    return (
      <AdminPrivacyProvider>
        <div className="admin-shell">
          <main className="min-h-screen w-full">{children}</main>
        </div>
      </AdminPrivacyProvider>
    );
  }

  return (
    <AdminPrivacyProvider>
      <div className="admin-shell">
        <AdminMobileNav
          currentUser={currentUser}
          isOpen={isMobileNavOpen}
          navCounts={navCounts}
          onClose={closeMobileNav}
        />
        <AdminSidebar currentUser={currentUser} navCounts={navCounts} />
        <div className="flex min-h-screen min-w-0 flex-col lg:ps-[16.5rem]">
          <AdminHeader
            currentUser={currentUser}
            navCounts={navCounts}
            onOpenNav={() => setIsMobileNavOpen(true)}
          />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="admin-content">{children}</div>
          </main>
        </div>
      </div>
    </AdminPrivacyProvider>
  );
}
