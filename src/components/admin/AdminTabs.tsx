"use client";

import clsx from "clsx";

export type AdminTabItem = {
  count?: number | string;
  id: string;
  label: string;
};

type AdminTabsProps = {
  className?: string;
  onChange: (value: string) => void;
  tabs: AdminTabItem[];
  value: string;
};

export function AdminTabs({
  className,
  onChange,
  tabs,
  value,
}: AdminTabsProps) {
  return (
    <div
      className={clsx(
        "flex flex-wrap gap-2",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === value;

        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(tab.id)}
            className="admin-chip"
          >
            <span>{tab.label}</span>
            {tab.count !== undefined ? (
              <span className="admin-chip-count">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
