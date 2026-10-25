"use client";

import clsx from "clsx";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getPopoverRoot, useFloating } from "./useFloating";

type Props = {
  helperText?: React.ReactNode;
  label: React.ReactNode;
  /** Earliest selectable day, YYYY-MM-DD. */
  min?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** YYYY-MM-DD or "" */
  value: string;
};

const pad = (value: number) => String(value).padStart(2, "0");
const toKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function fromKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Western digits everywhere, also in Arabic. */
function dateLocale(locale: string) {
  return `${locale}-u-nu-latn`;
}

/**
 * A compact calendar in the dashboard's own style. Shows a small month
 * grid in a floating panel; the field itself stays a normal-looking input.
 */
export function AdminDatePicker({ helperText, label, min, onChange, placeholder, value }: Props) {
  const t = useTranslations("Admin.datePicker");
  const locale = useLocale();
  const id = useId();
  const selected = fromKey(value);
  const minDate = min ? fromKey(min) : null;
  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [month, setMonth] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { style } = useFloating(triggerRef, panelRef, open, "start");
  const close = useCallback(() => setOpen(false), []);

  const formatter = useMemo(() => new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "medium" }), [locale]);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(dateLocale(locale), { month: "long", year: "numeric" }), [locale]);
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(dateLocale(locale), { weekday: "narrow" }), [locale]);

  // Weeks start on Monday (Germany).
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => weekdayFormatter.format(new Date(2024, 0, 1 + index))),
    [weekdayFormatter]
  );
  const days = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [month]);
  const todayKey = toKey(new Date());

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"], [data-today="true"]')?.focus()
    );
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
    };
  }, [close, open]);

  const shiftMonth = (delta: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="admin-label">
        {label}
      </label>
      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="admin-input flex items-center gap-2.5 text-start"
          onClick={() => {
            if (!open) setMonth(new Date((selected ?? new Date()).getFullYear(), (selected ?? new Date()).getMonth(), 1));
            setPortalRoot(getPopoverRoot(triggerRef.current));
            setOpen((current) => !current);
          }}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-gold-soft" />
          <span className={clsx("min-w-0 flex-1 truncate", !selected && "text-[var(--admin-soft)]")}>
            {selected ? formatter.format(selected) : placeholder ?? t("choose")}
          </span>
        </button>
        {selected ? (
          <button
            type="button"
            className="admin-icon-button admin-icon-button-quiet absolute end-1.5 top-1/2 h-7 w-7 -translate-y-1/2"
            aria-label={t("clear")}
            title={t("clear")}
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {helperText ? <p className="text-xs text-muted">{helperText}</p> : null}

      {open && portalRoot
        ? createPortal(
            <div ref={panelRef} role="dialog" aria-label={typeof label === "string" ? label : t("choose")} className="admin-menu admin-menu-floating admin-datepicker" style={style}>
              <div className="flex items-center justify-between gap-2 px-1 pb-2">
                <button type="button" className="admin-icon-button admin-icon-button-quiet h-8 w-8" aria-label={t("previous")} onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </button>
                <p className="text-sm font-semibold text-[var(--admin-text)]" aria-live="polite">
                  {monthFormatter.format(month)}
                </p>
                <button type="button" className="admin-icon-button admin-icon-button-quiet h-8 w-8" aria-label={t("next")} onClick={() => shiftMonth(1)}>
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center" role="grid">
                {weekdays.map((day, index) => (
                  <span key={`${day}-${index}`} className="pb-1 text-[0.7rem] font-medium text-[var(--admin-soft)]">
                    {day}
                  </span>
                ))}
                {days.map((day) => {
                  const key = toKey(day);
                  const outside = day.getMonth() !== month.getMonth();
                  const disabled = Boolean(minDate && day < minDate);
                  const isSelected = key === value;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isSelected}
                      data-today={key === todayKey ? "true" : undefined}
                      aria-label={formatter.format(day)}
                      className={clsx(
                        "admin-datepicker-day",
                        outside && "admin-datepicker-day-outside",
                        isSelected && "admin-datepicker-day-selected"
                      )}
                      onClick={() => {
                        onChange(key);
                        close();
                        triggerRef.current?.focus();
                      }}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between border-t border-[var(--admin-line)] px-1 pt-2">
                <button
                  type="button"
                  className="text-xs font-medium text-gold-soft hover:underline disabled:opacity-40"
                  disabled={Boolean(minDate && new Date() < minDate)}
                  onClick={() => {
                    onChange(todayKey);
                    close();
                  }}
                >
                  {t("today")}
                </button>
                {selected ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--admin-muted)] hover:underline"
                    onClick={() => {
                      onChange("");
                      close();
                    }}
                  >
                    {t("clear")}
                  </button>
                ) : null}
              </div>
            </div>,
            portalRoot
          )
        : null}
    </div>
  );
}
