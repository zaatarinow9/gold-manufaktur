import clsx from "clsx";

import { trimDisplayHeading } from "@/lib/displayText";

type AdminPageHeaderProps = {
  actions?: React.ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  meta?: React.ReactNode;
  title: React.ReactNode;
};

export function AdminPageHeader({
  actions,
  className,
  description,
  eyebrow,
  meta,
  title,
}: AdminPageHeaderProps) {
  return (
    <div
      className={clsx(
        "admin-page-header flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
        className
      )}
    >
      <div className="min-w-0 max-w-3xl space-y-2">
        {eyebrow ? <p className="admin-page-kicker">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="admin-heading text-foreground">
            {typeof title === "string" ? trimDisplayHeading(title) : title}
          </h1>
          {meta}
        </div>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-[0.95rem]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="admin-page-header-actions flex flex-wrap items-center gap-2 lg:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
