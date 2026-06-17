"use client";

import { useState } from "react";

import { usePathname } from "@/i18n/navigation";
import { setCurrentAdminUser } from "@/lib/admin/currentUser";
import type { AdminUser } from "@/types/admin";
import { AdminHeader } from "./AdminHeader";
import { AdminMobileNav } from "./AdminMobileNav";
import { AdminSidebar } from "./AdminSidebar";

type AdminShellProps = {
  children: React.ReactNode;
  currentUser: AdminUser;
};

export function AdminShell({ children, currentUser }: AdminShellProps) {
  const pathname = usePathname() ?? "/admin";
  const isLoginRoute = pathname === "/admin/login";
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  setCurrentAdminUser(currentUser);

  if (isLoginRoute) {
    return (
      <div className="admin-shell">
        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="w-full">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <AdminMobileNav
        currentUser={currentUser}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar currentUser={currentUser} />
        <div className="flex min-w-0 flex-1 flex-col lg:ps-[17rem]">
          <AdminHeader
            currentUser={currentUser}
            onOpenNav={() => setIsMobileNavOpen(true)}
          />
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            <div className="admin-content">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
