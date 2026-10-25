"use client";

import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getPopoverRoot, useFloating } from "./useFloating";

export type AdminActionMenuItem = {
  danger?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  label: string;
  onSelect: () => void;
};

type AdminActionMenuProps = {
  className?: string;
  items: AdminActionMenuItem[];
  label: string;
};

/**
 * "More actions" button. The menu floats above the page (portal + fixed
 * position), so it is never cut off by the card or list it sits in.
 */
export function AdminActionMenu({ className, items, label }: AdminActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const close = useCallback(() => setIsOpen(false), []);
  const { style } = useFloating(triggerRef, menuRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
        if (buttons.length === 0) return;
        event.preventDefault();
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "ArrowDown" ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    // Focus the first entry so keyboard users can go straight on.
    const frame = requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus());
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
    };
  }, [close, isOpen]);


  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        className="admin-icon-button admin-icon-button-quiet h-9 w-9"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={label}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setPortalRoot(getPopoverRoot(triggerRef.current));
          setIsOpen((current) => !current);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {isOpen && portalRoot
        ? createPortal(
            <div ref={menuRef} id={menuId} role="menu" aria-label={label} className="admin-menu admin-menu-floating" style={style}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    data-danger={item.danger ? "true" : undefined}
                    className="admin-menu-item disabled:opacity-40"
                    onClick={(event) => {
                      event.stopPropagation();
                      close();
                      item.onSelect();
                    }}
                  >
                    {Icon ? <Icon /> : null}
                    {item.label}
                  </button>
                );
              })}
            </div>,
            portalRoot
          )
        : null}
    </div>
  );
}
