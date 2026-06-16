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
        "inline-flex flex-wrap gap-2 rounded-[0.95rem] border border-white/8 bg-white/4 p-1.5",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === value;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              "inline-flex items-center gap-2 rounded-[0.8rem] px-3.5 py-2 text-sm font-medium transition",
              isActive
                ? "bg-gold/16 text-foreground shadow-[inset_0_0_0_1px_rgba(232,201,135,0.14)]"
                : "text-muted hover:bg-white/6 hover:text-foreground"
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined ? (
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[0.68rem] font-semibold",
                  isActive ? "bg-black/20 text-gold-soft" : "bg-white/6 text-muted"
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
