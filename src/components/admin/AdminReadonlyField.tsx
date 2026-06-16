import clsx from "clsx";

type AdminReadonlyFieldProps = {
  className?: string;
  label?: React.ReactNode;
  tone?: "default" | "gold";
  value: React.ReactNode;
};

export function AdminReadonlyField({
  className,
  label,
  tone = "default",
  value,
}: AdminReadonlyFieldProps) {
  return (
    <div className={clsx("block space-y-2", className)}>
      {label ? <span className="admin-label">{label}</span> : null}
      <div
        className={clsx(
          "admin-readonly-field",
          tone === "gold" && "admin-readonly-field-gold"
        )}
      >
        {value}
      </div>
    </div>
  );
}
