import clsx from "clsx";

type AdminEmptyStateProps = {
  action?: React.ReactNode;
  className?: string;
  description?: string;
  title: string;
};

export function AdminEmptyState({
  action,
  className,
  description,
  title,
}: AdminEmptyStateProps) {
  return (
    <div className={clsx("admin-empty-state", className)}>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
