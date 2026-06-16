import clsx from "clsx";

type AdminSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  helperText?: React.ReactNode;
  label?: React.ReactNode;
  wrapperClassName?: string;
};

export function AdminSelect({
  children,
  className,
  helperText,
  label,
  required,
  wrapperClassName,
  ...props
}: AdminSelectProps) {
  return (
    <label className={clsx("block space-y-2", wrapperClassName)}>
      {label ? (
        <span className="admin-label">
          {label}
          {required ? <span className="admin-required">*</span> : null}
        </span>
      ) : null}
      <select
        className={clsx("admin-select", className)}
        required={required}
        {...props}
      >
        {children}
      </select>
      {helperText ? <span className="admin-helper">{helperText}</span> : null}
    </label>
  );
}
