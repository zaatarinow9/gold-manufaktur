import clsx from "clsx";

type AdminTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  helperText?: React.ReactNode;
  label?: React.ReactNode;
  wrapperClassName?: string;
};

export function AdminTextarea({
  className,
  helperText,
  label,
  required,
  rows = 4,
  wrapperClassName,
  ...props
}: AdminTextareaProps) {
  return (
    <label className={clsx("block space-y-2", wrapperClassName)}>
      {label ? (
        <span className="admin-label">
          {label}
          {required ? <span className="admin-required">*</span> : null}
        </span>
      ) : null}
      <textarea
        className={clsx("admin-input min-h-28 py-3", className)}
        required={required}
        rows={rows}
        {...props}
      />
      {helperText ? <span className="admin-helper">{helperText}</span> : null}
    </label>
  );
}
