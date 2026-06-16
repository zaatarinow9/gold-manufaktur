import clsx from "clsx";

import { AdminBadge } from "./AdminBadge";

type AdminStatCardProps = {
  badge?: string;
  className?: string;
  hint?: string;
  icon?: React.ReactNode;
  label: string;
  value: number | string;
};

export function AdminStatCard({
  badge,
  className,
  hint,
  icon,
  label,
  value,
}: AdminStatCardProps) {
  return (
    <div className={clsx("admin-panel px-4 py-4 sm:px-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="text-[1.7rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
            {value}
          </p>
        </div>
        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/18 bg-gold/10 text-gold-soft">
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {badge ? <AdminBadge variant="gold">{badge}</AdminBadge> : null}
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
