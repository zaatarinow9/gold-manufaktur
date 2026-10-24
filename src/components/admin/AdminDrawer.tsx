"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";

type AdminDrawerProps = {
  children: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  open: boolean;
  title: React.ReactNode;
};

/**
 * Side panel editor. Opens from the inline end (right in LTR, left in RTL),
 * locks page scroll, closes on Escape, and returns focus to the opener.
 */
export function AdminDrawer({
  children,
  description,
  footer,
  onClose,
  open,
  title,
}: AdminDrawerProps) {
  const t = useTranslations("Admin");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], input:not([type=hidden]):not([disabled]), select, textarea"
      );
      (first ?? panelRef.current)?.focus();
    }, 30);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="admin-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="admin-drawer outline-none"
      >
        <div className="admin-drawer-header flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm leading-6 text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-icon-button admin-icon-button-quiet -me-1"
            aria-label={t("buttons.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="admin-drawer-body">{children}</div>
        {footer ? <div className="admin-drawer-footer">{footer}</div> : null}
      </div>
    </>
  );
}

type AdminFormSectionProps = {
  children: React.ReactNode;
  hint?: React.ReactNode;
  title: React.ReactNode;
};

export function AdminFormSection({ children, hint, title }: AdminFormSectionProps) {
  return (
    <section className="admin-form-section">
      <div className="mb-4">
        <h3 className="admin-form-section-title">{title}</h3>
        {hint ? <p className="admin-form-section-hint">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
