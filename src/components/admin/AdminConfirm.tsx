"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";

type ConfirmOptions = {
  /** Text on the confirm button, e.g. "Delete". */
  confirmLabel?: string;
  /** Red confirm button and warning icon. Defaults to true. */
  danger?: boolean;
  description?: React.ReactNode;
  title: React.ReactNode;
};

type ConfirmRequest = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/**
 * One confirmation dialog for the whole dashboard. Call
 * `const confirm = useAdminConfirm(); if (await confirm({...})) …`
 */
export function AdminConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({ ...options, resolve });
      }),
    []
  );

  const close = (value: boolean) => {
    request?.resolve(value);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request ? <ConfirmDialog request={request} onClose={close} /> : null}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ onClose, request }: { onClose: (value: boolean) => void; request: ConfirmRequest }) {
  const t = useTranslations("Admin");
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const danger = request.danger ?? true;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center">
      <button type="button" tabIndex={-1} aria-hidden="true" className="admin-drawer-backdrop cursor-default" onClick={() => onClose(false)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="admin-confirm relative z-[91] w-full max-w-md rounded-[1rem] border border-[var(--admin-line)] bg-[var(--admin-raised)] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex gap-4">
          {danger ? (
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {request.title}
            </h2>
            {request.description ? <div className="mt-1.5 text-sm leading-6 text-muted">{request.description}</div> : null}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" className="admin-button admin-button-ghost" onClick={() => onClose(false)}>
            {t("buttons.cancel")}
          </button>
          <button
            type="button"
            className={danger ? "admin-button admin-button-danger" : "admin-button admin-button-primary"}
            onClick={() => onClose(true)}
          >
            {request.confirmLabel ?? (danger ? t("buttons.delete") : t("buttons.confirm"))}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useAdminConfirm() {
  const confirm = useContext(ConfirmContext);
  return useCallback(
    async (options: ConfirmOptions) => {
      if (confirm) return confirm(options);
      // Outside the dashboard shell (should not happen) fall back to the browser dialog.
      return window.confirm(typeof options.title === "string" ? options.title : "");
    },
    [confirm]
  );
}
