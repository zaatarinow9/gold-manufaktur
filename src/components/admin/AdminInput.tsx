import { useId } from "react";
import clsx from "clsx";

type AdminInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  errorText?: React.ReactNode;
  helperText?: React.ReactNode;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  requiredLabel?: React.ReactNode;
  wrapperClassName?: string;
};

export function AdminInput({
  className,
  errorText,
  helperText,
  icon,
  label,
  required,
  requiredLabel,
  wrapperClassName,
  ...props
}: AdminInputProps) {
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
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute start-3.5 top-1/2 z-[1] -translate-y-1/2 text-muted">
            {icon}
          </span>
        ) : null}
        <input
          id={fieldId}
          aria-describedby={describedBy || undefined}
          aria-invalid={invalid}
          className={clsx(
            "admin-input",
            icon && "admin-input-with-icon",
            invalid && "border-rose-400/40 focus:border-rose-300/60",
            className
          )}
          required={required}
          {...props}
        />
      </div>
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
