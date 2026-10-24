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
    <div className={clsx("admin-panel p-4", className)}>
      <div className="flex items-center gap-2 text-muted">
        {icon ? <span className="text-gold-soft [&_svg]:h-4 [&_svg]:w-4">{icon}</span> : null}
        <p className="text-sm font-medium">{label}</p>
        {badge ? <AdminBadge variant="gold" className="ms-auto">{badge}</AdminBadge> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted">{hint}</p> : null}
    </div>
  );
}
