"use client";

import clsx from "clsx";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { useDismiss } from "./useDismiss";

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

/** "More actions" button with a small dropdown menu. */
export function AdminActionMenu({ className, items, label }: AdminActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setIsOpen(false), []);

  useDismiss(containerRef, isOpen, close);

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        className="admin-icon-button admin-icon-button-quiet h-9 w-9"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {isOpen ? (
        <div role="menu" className="admin-menu end-0 top-full mt-1">
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
        </div>
      ) : null}
    </div>
  );
}
