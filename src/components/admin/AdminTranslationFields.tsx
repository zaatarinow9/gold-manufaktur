"use client";

import clsx from "clsx";
import { ChevronDown, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import type { AppLocale } from "@/i18n/routing";
import { localeLabels } from "@/lib/site";

export type LocalizedValue = Record<AppLocale, string>;

export type TranslationField = {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
  /** Required in German and Arabic (the shop's two main languages). */
  required?: boolean;
  value: LocalizedValue;
};

type AdminTranslationFieldsProps = {
  errors?: Record<string, string | undefined>;
  fields: TranslationField[];
  onChange: (fieldKey: string, locale: AppLocale, value: string) => void;
};

export const primaryContentLocales = ["de", "ar"] as const satisfies readonly AppLocale[];
export const secondaryContentLocales = ["en", "fr", "tr"] as const satisfies readonly AppLocale[];

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
    <textarea
      {...shared}
      className="admin-textarea min-h-[5.5rem]"
      onChange={(event) => onChange(event.target.value)}
    />
  ) : (
    <input
      {...shared}
      className="admin-input"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/**
 * Multilingual text inputs. German and Arabic are shown side by side and are
 * the required pair; English, French and Turkish sit in a collapsible panel
 * because the website falls back to German when they are left empty.
 */
export function AdminTranslationFields({
  errors = {},
  fields,
  onChange,
}: AdminTranslationFieldsProps) {
  const t = useTranslations("Admin.translations");
  const uiLocale = useLocale();
  // Show the editor's own language first when it is one of the two main ones.
  const orderedPrimary =
    uiLocale === "ar" ? (["ar", "de"] as const) : primaryContentLocales;
  const hasSecondaryError = fields.some((field) =>
    secondaryContentLocales.some((locale) => errors[`${field.key}.${locale}`])
  );
  const [showOthers, setShowOthers] = useState(false);
  const othersOpen = showOthers || hasSecondaryError;
  const filledSecondary = secondaryContentLocales.filter((locale) =>
    fields.some((field) => field.value[locale]?.trim())
  ).length;

  return (
    <div className="space-y-5">
      {fields.map((field) => (
        <fieldset key={field.key} className="space-y-2">
          <legend className="admin-label mb-2">
            {field.label}
            {field.required ? (
              <>
                <span className="admin-required" aria-hidden="true">*</span>
                <span className="sr-only">{t("required")}</span>
              </>
            ) : (
              <span className="admin-optional">{t("optional")}</span>
            )}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {orderedPrimary.map((locale) => {
              const id = `${field.key}.${locale}`;
              const error = errors[id];
              return (
                <div key={locale} className="space-y-1">
                  <label htmlFor={id} className="text-xs font-medium text-muted">
                    {localeLabels[locale]}
                  </label>
                  <TextControl
                    id={id}
                    locale={locale}
                    multiline={field.multiline}
                    placeholder={field.placeholder}
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
        </fieldset>
      ))}

      <div className="admin-panel-raised">
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-start"
          aria-expanded={othersOpen}
          onClick={() => setShowOthers((current) => !current)}
        >
          <Languages className="h-4 w-4 shrink-0 text-gold-soft" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">
              {t("otherLanguages")}
            </span>
            <span className="block text-xs text-muted">
              {t("otherLanguagesStatus", {
                count: filledSecondary,
                total: secondaryContentLocales.length,
              })}
            </span>
          </span>
          <ChevronDown className={clsx("h-4 w-4 shrink-0 text-muted transition", othersOpen && "rotate-180")} />
        </button>

        {othersOpen ? (
          <div className="space-y-5 border-t border-white/[0.06] px-4 py-4">
            <p className="text-xs leading-5 text-muted">{t("fallbackHint")}</p>
            {secondaryContentLocales.map((locale) => (
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
                        placeholder={field.value.de || field.placeholder}
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
