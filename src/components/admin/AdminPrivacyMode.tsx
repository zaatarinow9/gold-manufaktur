"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  ADMIN_PRIVACY_STORAGE_KEY,
  getAdminPrivacyUiCopy,
} from "@/lib/admin/privacy";

type AdminPrivacyContextValue = {
  enabled: boolean;
  masked: boolean;
  ready: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
};

const AdminPrivacyContext = createContext<AdminPrivacyContextValue | null>(null);
const ADMIN_PRIVACY_CHANGE_EVENT = "goldhelwah-admin-privacy-change";

function readStoredPrivacyMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(ADMIN_PRIVACY_STORAGE_KEY) === "true";
}

function subscribeToPrivacyMode(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== ADMIN_PRIVACY_STORAGE_KEY) {
      return;
    }

    onStoreChange();
  };
  const handlePrivacyChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ADMIN_PRIVACY_CHANGE_EVENT, handlePrivacyChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ADMIN_PRIVACY_CHANGE_EVENT, handlePrivacyChange);
  };
}

function writeStoredPrivacyMode(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_PRIVACY_STORAGE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event(ADMIN_PRIVACY_CHANGE_EVENT));
}

export function AdminPrivacyProvider({ children }: { children: React.ReactNode }) {
  const enabled = useSyncExternalStore(
    subscribeToPrivacyMode,
    readStoredPrivacyMode,
    () => false
  );
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== "h") {
        return;
      }

      event.preventDefault();
      writeStoredPrivacyMode(!readStoredPrivacyMode());
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const value = useMemo<AdminPrivacyContextValue>(
    () => ({
      enabled,
      masked: !ready || enabled,
      ready,
      setEnabled: writeStoredPrivacyMode,
      toggle: () => writeStoredPrivacyMode(!readStoredPrivacyMode()),
    }),
    [enabled, ready]
  );

  return (
    <AdminPrivacyContext.Provider value={value}>{children}</AdminPrivacyContext.Provider>
  );
}

export function useAdminPrivacyMode() {
  const context = useContext(AdminPrivacyContext);

  if (!context) {
    throw new Error("useAdminPrivacyMode must be used inside AdminPrivacyProvider.");
  }

  return context;
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

export { getAdminPrivacyUiCopy };
