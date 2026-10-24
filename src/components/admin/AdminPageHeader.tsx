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
        "admin-page-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 max-w-3xl space-y-1.5">
        {/* A small label only when it adds context, never a repeat of the title. */}
        {eyebrow && eyebrow.trim().toLowerCase() !== String(title).trim().toLowerCase() ? (
          <p className="admin-page-kicker">{eyebrow}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="admin-heading text-foreground">
            {typeof title === "string" ? trimDisplayHeading(title) : title}
          </h1>
          {meta}
        </div>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="admin-page-header-actions flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
