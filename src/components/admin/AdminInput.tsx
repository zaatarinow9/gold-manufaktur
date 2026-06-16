import clsx from "clsx";

type AdminInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  helperText?: React.ReactNode;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  wrapperClassName?: string;
};

export function AdminInput({
  className,
  helperText,
  icon,
  label,
  required,
  wrapperClassName,
  ...props
}: AdminInputProps) {
  return (
    <label className={clsx("block space-y-2", wrapperClassName)}>
      {label ? (
        <span className="admin-label">
          {label}
          {required ? <span className="admin-required">*</span> : null}
        </span>
      ) : null}
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute start-3.5 top-1/2 z-[1] -translate-y-1/2 text-muted">
            {icon}
          </span>
        ) : null}
        <input
          className={clsx("admin-input", icon && "admin-input-with-icon", className)}
          required={required}
          {...props}
        />
      </div>
      {helperText ? <span className="admin-helper">{helperText}</span> : null}
    </label>
  );
}
