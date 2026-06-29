"use client";

import { useState } from "react";

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
  const isLoginRoute = pathname === "/admin/login";
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (isLoginRoute) {
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
          onClose={() => setIsMobileNavOpen(false)}
        />
        <div className="flex h-screen overflow-hidden">
          <AdminSidebar currentUser={currentUser} navCounts={navCounts} />
          <div className="flex min-w-0 flex-1 flex-col lg:ps-[17rem]">
            <AdminHeader
              currentUser={currentUser}
              navCounts={navCounts}
              onOpenNav={() => setIsMobileNavOpen(true)}
            />
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
              <div className="admin-content">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </AdminPrivacyProvider>
  );
}
