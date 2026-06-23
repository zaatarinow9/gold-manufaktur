"use client";

import { createContext, useContext } from "react";

type AdminPrivacyContextValue = {
  enabled: boolean;
  masked: boolean;
  ready: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
};

const defaultPrivacyContextValue: AdminPrivacyContextValue = {
  enabled: false,
  masked: false,
  ready: true,
  setEnabled: () => {},
  toggle: () => {},
};

const AdminPrivacyContext = createContext<AdminPrivacyContextValue>(
  defaultPrivacyContextValue
);

export function AdminPrivacyProvider({ children }: { children: React.ReactNode }) {
  return (
    <AdminPrivacyContext.Provider value={defaultPrivacyContextValue}>
      {children}
    </AdminPrivacyContext.Provider>
  );
}

export function useAdminPrivacyMode() {
  return useContext(AdminPrivacyContext);
}

export function AdminPrivacyGuard({
  active = true,
  children,
  fallback = null,
}: {
  active?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { masked } = useAdminPrivacyMode();

  if (active && masked) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
