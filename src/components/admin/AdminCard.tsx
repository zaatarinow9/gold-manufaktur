import clsx from "clsx";

type AdminCardProps = {
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  description?: string;
  eyebrow?: string;
  title?: string;
};

export function AdminCard({
  action,
  children,
  className,
  contentClassName,
  description,
  eyebrow,
  title,
}: AdminCardProps) {
  const hasHeader = Boolean(action || description || eyebrow || title);

  return (
    <section className={clsx("admin-panel overflow-hidden", className)}>
      {hasHeader ? (
        <div className="border-b border-white/[0.06] px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {eyebrow ? <p className="admin-page-kicker">{eyebrow}</p> : null}
              {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
              {description ? (
                <p className="max-w-2xl text-sm leading-6 text-muted">{description}</p>
              ) : null}
            </div>
            {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
          </div>
        </div>
      ) : null}
      <div className={clsx("p-5", contentClassName)}>{children}</div>
    </section>
  );
}
