import clsx from "clsx";

type AdminBadgeProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "danger" | "gold" | "info" | "neutral" | "success" | "warning";
};

const variantClasses: Record<NonNullable<AdminBadgeProps["variant"]>, string> = {
  gold: "border-gold/30 bg-gold/10 text-gold-soft",
  success: "border-emerald-400/24 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-400/24 bg-amber-400/10 text-amber-200",
  danger: "border-rose-400/24 bg-rose-400/10 text-rose-200",
  info: "border-sky-400/24 bg-sky-400/10 text-sky-200",
  neutral: "border-white/10 bg-white/[0.04] text-muted",
};

export function AdminBadge({
  children,
  className,
  variant = "neutral",
}: AdminBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
