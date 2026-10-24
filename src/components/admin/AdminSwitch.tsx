"use client";

import { useId } from "react";

type AdminSwitchProps = {
  checked: boolean;
  description?: React.ReactNode;
  disabled?: boolean;
  label: React.ReactNode;
  onChange: (checked: boolean) => void;
};

/** A labelled on/off switch row. */
export function AdminSwitch({
  checked,
  description,
  disabled,
  label,
  onChange,
}: AdminSwitchProps) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-foreground">
          {label}
        </p>
        {description ? (
          <p id={descriptionId} className="mt-0.5 text-sm leading-5 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="admin-switch mt-0.5 disabled:opacity-50"
      />
    </div>
  );
}
