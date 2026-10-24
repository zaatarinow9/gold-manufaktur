import { useId } from "react";
import clsx from "clsx";

type AdminTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  errorText?: React.ReactNode;
  helperText?: React.ReactNode;
  label?: React.ReactNode;
  requiredLabel?: React.ReactNode;
  wrapperClassName?: string;
};

export function AdminTextarea({
  className,
  errorText,
  helperText,
  label,
  required,
  requiredLabel,
  rows = 4,
  wrapperClassName,
  ...props
}: AdminTextareaProps) {
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const errorId = errorText ? `${fieldId}-error` : undefined;
  const invalid = Boolean(errorText) || props["aria-invalid"] === true;
  const describedBy = [props["aria-describedby"], errorId, helperId]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={clsx("block space-y-1.5", wrapperClassName)}>
      {label ? (
        <span className="admin-label">
          {label}
          {required ? (
            <>
              <span className="admin-required" aria-hidden="true">*</span>
              {requiredLabel ? <span className="sr-only">{requiredLabel}</span> : null}
            </>
          ) : null}
        </span>
      ) : null}
      <textarea
        id={fieldId}
        aria-describedby={describedBy || undefined}
        aria-invalid={invalid}
        className={clsx(
          "admin-input min-h-28 py-3",
          invalid && "border-rose-400/40 focus:border-rose-300/60",
          className
        )}
        required={required}
        rows={rows}
        {...props}
      />
      {errorText ? (
        <span id={errorId} role="alert" className="block text-xs text-rose-300">
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
