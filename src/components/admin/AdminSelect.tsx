import { useId } from "react";
import clsx from "clsx";

type AdminSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  errorText?: React.ReactNode;
  helperText?: React.ReactNode;
  label?: React.ReactNode;
  requiredLabel?: React.ReactNode;
  wrapperClassName?: string;
};

export function AdminSelect({
  children,
  className,
  errorText,
  helperText,
  label,
  required,
  requiredLabel,
  wrapperClassName,
  ...props
}: AdminSelectProps) {
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const errorId = errorText ? `${fieldId}-error` : undefined;
  const invalid = Boolean(errorText) || props["aria-invalid"] === true;
  const describedBy = [props["aria-describedby"], errorId, helperId]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={clsx("block space-y-2", wrapperClassName)}>
      {label ? (
        <span className="admin-label">
          {label}
          {required ? <span className="admin-required">*</span> : null}
          {required && requiredLabel ? (
            <span className="ms-2 text-[0.72rem] font-normal text-muted">
              {requiredLabel}
            </span>
          ) : null}
        </span>
      ) : null}
      <select
        id={fieldId}
        aria-describedby={describedBy || undefined}
        aria-invalid={invalid}
        className={clsx(
          "admin-select",
          invalid && "border-rose-400/40 focus:border-rose-300/60",
          className
        )}
        required={required}
        {...props}
      >
        {children}
      </select>
      {errorText ? (
        <span id={errorId} className="text-xs text-rose-300">
          {errorText}
        </span>
      ) : helperText ? (
        <span id={helperId} className="admin-helper">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
