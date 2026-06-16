import clsx from "clsx";

type AdminToolbarProps = {
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AdminToolbar({
  actions,
  children,
  className,
}: AdminToolbarProps) {
  return (
    <div className={clsx("admin-toolbar", className)}>
      <div className="admin-toolbar-grid">{children}</div>
      {actions ? <div className="admin-toolbar-actions">{actions}</div> : null}
    </div>
  );
}
