import clsx from "clsx";

type AdminSectionProps = {
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  description?: string;
  title: string;
};

export function AdminSection({
  action,
  children,
  className,
  description,
  title,
}: AdminSectionProps) {
  return (
    <section
      className={clsx(
        "rounded-[1rem] border border-white/8 bg-black/18 p-4 sm:p-5",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="text-sm leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
