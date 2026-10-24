"use client";

import clsx from "clsx";
import { ChevronDown, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { routing, type AppLocale } from "@/i18n/routing";
import { localeLabels } from "@/lib/site";

export type LocalizedValue = Record<AppLocale, string>;

export type TranslationField = {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
  /** Must be filled in at least one language. */
  required?: boolean;
  value: LocalizedValue;
};

type AdminTranslationFieldsProps = {
  errors?: Record<string, string | undefined>;
  fields: TranslationField[];
  onChange: (fieldKey: string, locale: AppLocale, value: string) => void;
};

function TextControl({
  error,
  id,
  locale,
  multiline,
  onChange,
  placeholder,
  value,
}: {
  error?: string;
  id: string;
  locale: AppLocale;
  multiline?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const shared = {
    id,
    name: id,
    value,
    dir: locale === "ar" ? "rtl" : "ltr",
    lang: locale,
    placeholder,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;

  return multiline ? (
    <textarea {...shared} className="admin-textarea min-h-[5.5rem]" onChange={(event) => onChange(event.target.value)} />
  ) : (
    <input {...shared} className="admin-input" onChange={(event) => onChange(event.target.value)} />
  );
}

/**
 * Multilingual text inputs. You write in your own dashboard language; the
 * other four languages are optional and folded away. The website shows the
 * best available language when a translation is missing.
 */
export function AdminTranslationFields({ errors = {}, fields, onChange }: AdminTranslationFieldsProps) {
  const t = useTranslations("Admin.translations");
  const primary = useLocale() as AppLocale;
  const others = routing.locales.filter((locale) => locale !== primary);

  const fieldError = (key: string) =>
    errors[`${key}.${primary}`] ?? routing.locales.map((locale) => errors[`${key}.${locale}`]).find(Boolean);
  const hasOtherError = fields.some((field) => others.some((locale) => errors[`${field.key}.${locale}`]) && !field.required);
  const [showOthers, setShowOthers] = useState(false);
  const othersOpen = showOthers || hasOtherError;
  const filledOthers = others.filter((locale) => fields.some((field) => field.value[locale]?.trim())).length;

  // A value typed in another language counts for "required" too, so show it
  // as the placeholder of the main field instead of an error.
  const fallbackFor = (field: TranslationField) =>
    others.map((locale) => field.value[locale]?.trim()).find(Boolean) ?? field.placeholder;

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const id = `${field.key}.${primary}`;
        const error = fieldError(field.key);
        return (
          <div key={field.key} className="space-y-1.5">
            <label htmlFor={id} className="admin-label">
              {field.label}
              {field.required ? (
                <>
                  <span className="admin-required" aria-hidden="true">*</span>
                  <span className="sr-only">{t("required")}</span>
                </>
              ) : (
                <span className="admin-optional">{t("optional")}</span>
              )}
            </label>
            <TextControl
              id={id}
              locale={primary}
              multiline={field.multiline}
              placeholder={fallbackFor(field)}
              value={field.value[primary] ?? ""}
              error={error}
              onChange={(value) => onChange(field.key, primary, value)}
            />
            {error ? (
              <p id={`${id}-error`} role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      <div className="admin-panel-raised">
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-start"
          aria-expanded={othersOpen}
          onClick={() => setShowOthers((current) => !current)}
        >
          <Languages className="h-4 w-4 shrink-0 text-gold-soft" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">{t("otherLanguages")}</span>
            <span className="block text-xs text-muted">
              {t("otherLanguagesStatus", { count: filledOthers, total: others.length })}
            </span>
          </span>
          <ChevronDown className={clsx("h-4 w-4 shrink-0 text-muted transition", othersOpen && "rotate-180")} />
        </button>

        {othersOpen ? (
          <div className="space-y-5 border-t border-white/[0.06] px-4 py-4">
            <p className="text-xs leading-5 text-muted">{t("fallbackHint")}</p>
            {others.map((locale) => (
              <div key={locale} className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{localeLabels[locale]}</p>
                {fields.map((field) => {
                  const id = `${field.key}.${locale}`;
                  const error = errors[id];
                  return (
                    <div key={id} className="space-y-1">
                      <label htmlFor={id} className="text-xs font-medium text-muted">
                        {field.label}
                      </label>
                      <TextControl
                        id={id}
                        locale={locale}
                        multiline={field.multiline}
                        placeholder={field.value[primary] || field.placeholder}
                        value={field.value[locale] ?? ""}
                        error={error}
                        onChange={(value) => onChange(field.key, locale, value)}
                      />
                      {error ? (
                        <p id={`${id}-error`} role="alert" className="text-xs text-rose-300">
                          {error}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
