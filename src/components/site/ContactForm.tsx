"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { LoaderCircle, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import type { CatalogProduct } from "@/types/catalog";
import { focusFirstInvalidField } from "@/lib/admin/clientForm";
import {
  contactInquiryDefaults,
  contactInquirySchema,
  type ContactInquiryInput,
} from "@/lib/contact";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";

type SubmissionState = "error" | "idle" | "success";

type ContactFormProps = {
  product?: CatalogProduct | null;
};

type OptionFieldValue = boolean | number | string | string[];

function normalizeFieldValue(type: string, value: OptionFieldValue): boolean | number | string | string[] | null {
  if (type === "boolean") {
    return value === true;
  }

  if (type === "multi_select") {
    return Array.isArray(value) ? value : [];
  }

  if (type === "number") {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value ?? null;
}

function isMissingRequiredValue(type: string, value: OptionFieldValue | undefined) {
  if (type === "boolean") {
    return value !== true;
  }

  if (type === "multi_select") {
    return !Array.isArray(value) || value.length === 0;
  }

  if (type === "number") {
    if (typeof value === "number") {
      return !Number.isFinite(value);
    }

    return typeof value !== "string" || value.trim().length === 0;
  }

  return typeof value !== "string" || value.trim().length === 0;
}


type FieldShellProps = {
  children: React.ReactNode;
  error?: string | null;
  errorId?: string;
  hint?: string;
  label: string;
  optionalLabel?: string;
  as?: "label" | "div";
};

function FieldShell({ as = "label", children, error, errorId, hint, label, optionalLabel }: FieldShellProps) {
  const Tag = as;
  return (
    <Tag className="site-field">
      <span className="site-field-label">
        {label}
        {optionalLabel ? <span className="site-field-optional">{optionalLabel}</span> : null}
      </span>
      {children}
      {hint ? <span className="site-field-hint">{hint}</span> : null}
      {error ? (
        <span id={errorId} role="alert" className="site-field-error">
          {error}
        </span>
      ) : null}
    </Tag>
  );
}

export function ContactForm({ product }: ContactFormProps) {
  const t = useTranslations("Contact.form");
  const shop = useTranslations("Shop.card");
  const locale = useLocale();
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [optionValues, setOptionValues] = useState<Record<string, OptionFieldValue>>({});
  const [optionErrors, setOptionErrors] = useState<Record<string, string>>({});

  const defaultMessage = useMemo(
    () => (product ? t("productDefaultMessage") : contactInquiryDefaults.message),
    [product, t]
  );

  const getValidationMessage = (message?: string) =>
    message ? t(`validation.${message}`) : null;

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ContactInquiryInput>({
    defaultValues: {
      ...contactInquiryDefaults,
      message: defaultMessage,
    },
    resolver: zodResolver(contactInquirySchema),
  });

  const productOptions = product?.optionGroup?.options ?? [];

  const onValid = async (values: ContactInquiryInput) => {
    setSubmissionState("idle");
    setOptionErrors({});

    if (productOptions.length > 0) {
      const nextOptionErrors = Object.fromEntries(
        productOptions.flatMap((field) => {
          if (!field.isRequired || !isMissingRequiredValue(field.type, optionValues[field.id])) {
            return [];
          }

          return [[field.id, t("requiredField")]];
        })
      );

      if (Object.keys(nextOptionErrors).length > 0) {
        setOptionErrors(nextOptionErrors);
        setSubmissionState("error");
        return;
      }
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          locale,
          optionValues: productOptions.map((field) => ({
            key: field.key,
            label: field.label,
            type: field.type,
            value: normalizeFieldValue(field.type, optionValues[field.id] ?? ""),
          })),
          productSnapshot: product
            ? {
                categoryName: product.categoryName,
                id: product.id,
                imageUrl: product.imageUrl,
                name: product.name,
                price: "",
                sku: "",
                slug: product.slug,
              }
            : null,
          source: product ? "product" : "contact",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            fieldErrors?: Partial<Record<keyof ContactInquiryInput, string[]>>;
            success?: boolean;
          }
        | null;

      if (!response.ok || !payload?.success) {
        if (payload?.fieldErrors) {
          for (const [field, messages] of Object.entries(payload.fieldErrors)) {
            const message = messages?.[0];

            if (message) {
              setError(field as keyof ContactInquiryInput, { message });
            }
          }
        }

        setSubmissionState("error");
        return;
      }

      reset({
        ...contactInquiryDefaults,
        message: defaultMessage,
      });
      setOptionValues({});
      setOptionErrors({});
      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    }
  };

  const onInvalid = (formErrors: typeof errors) => {
    focusFirstInvalidField(
      Object.fromEntries(
        Object.entries(formErrors).flatMap(([field, value]) =>
          value?.message ? [[field, String(value.message)]] : []
        )
      )
    );
  };

  const clearOptionError = (fieldId: string) =>
    setOptionErrors((current) => {
      const next = { ...current };
      delete next[fieldId];
      return next;
    });

  const setOptionValue = (fieldId: string, value: OptionFieldValue) => {
    clearOptionError(fieldId);
    setOptionValues((current) => ({ ...current, [fieldId]: value }));
  };

  const renderOptionField = (field: (typeof productOptions)[number]) => {
    const errorText = optionErrors[field.id];
    const hint = field.helpText || undefined;
    const optionalLabel = field.isRequired ? undefined : t("optional");
    const currentValue = optionValues[field.id];
    const invalid = Boolean(errorText);

    if (field.type === "textarea") {
      return (
        <FieldShell key={field.id} label={field.label} hint={hint} error={errorText} optionalLabel={optionalLabel}>
          <textarea
            className="site-form-control resize-y"
            rows={4}
            aria-invalid={invalid}
            value={typeof currentValue === "string" ? currentValue : ""}
            placeholder={field.placeholder}
            onChange={(event) => setOptionValue(field.id, event.target.value)}
          />
        </FieldShell>
      );
    }

    if (field.type === "select") {
      return (
        <FieldShell key={field.id} label={field.label} hint={hint} error={errorText} optionalLabel={optionalLabel}>
          <select
            className="site-form-control"
            aria-invalid={invalid}
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(event) => setOptionValue(field.id, event.target.value)}
          >
            <option value="">{field.placeholder || "–"}</option>
            {field.values.map((value) => (
              <option key={`${field.id}-${value.value}`} value={value.value}>
                {value.label}
              </option>
            ))}
          </select>
        </FieldShell>
      );
    }

    if (field.type === "multi_select") {
      const selectedValues = Array.isArray(currentValue) ? currentValue : [];
      return (
        <FieldShell key={field.id} as="div" label={field.label} hint={hint} error={errorText} optionalLabel={optionalLabel}>
          <div className="flex flex-wrap gap-2">
            {field.values.map((value) => {
              const isChecked = selectedValues.includes(value.value);
              return (
                <label
                  key={`${field.id}-${value.value}`}
                  className={clsx(
                    "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition",
                    isChecked
                      ? "border-gold bg-gold/15 text-foreground"
                      : "border-[var(--border-strong)] text-muted hover:text-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={(event) =>
                      setOptionValue(
                        field.id,
                        event.target.checked
                          ? [...selectedValues, value.value]
                          : selectedValues.filter((item) => item !== value.value)
                      )
                    }
                  />
                  {value.label}
                </label>
              );
            })}
          </div>
        </FieldShell>
      );
    }

    if (field.type === "boolean") {
      return (
        <div key={field.id} className="site-field">
          <label className="flex cursor-pointer items-start gap-3 text-foreground">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--gold)]"
              checked={currentValue === true}
              onChange={(event) => setOptionValue(field.id, event.target.checked)}
            />
            <span>
              <span className="site-field-label block">{field.label}</span>
              {hint ? <span className="site-field-hint block">{hint}</span> : null}
            </span>
          </label>
          {errorText ? <span role="alert" className="site-field-error">{errorText}</span> : null}
        </div>
      );
    }

    return (
      <FieldShell key={field.id} label={field.label} hint={hint} error={errorText} optionalLabel={optionalLabel}>
        <input
          className="site-form-control"
          aria-invalid={invalid}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          inputMode={field.type === "number" ? "decimal" : undefined}
          value={typeof currentValue === "number" ? String(currentValue) : typeof currentValue === "string" ? currentValue : ""}
          placeholder={field.placeholder}
          onChange={(event) => setOptionValue(field.id, event.target.value)}
        />
      </FieldShell>
    );
  };

  const fieldError = (name: keyof ContactInquiryInput) => getValidationMessage(errors[name]?.message);

  return (
    <div className="luxury-panel p-5 sm:p-8">
      <form className="space-y-6 text-start" noValidate onSubmit={handleSubmit(onValid, onInvalid)}>
        {product ? (
          <div className="flex items-center gap-4 border-b border-[var(--border)] pb-6">
            <div className="media-frame relative h-20 w-20 shrink-0">
              <LuxuryMedia src={product.imageUrl} alt="" sizes="80px" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-text-soft">{t("productTitle")}</p>
              <h3 className="card-title mt-0.5 text-2xl text-foreground">{product.name}</h3>
              {product.categoryName ? <p className="text-sm text-muted">{product.categoryName}</p> : null}
              {product.supportsNameCustomization ? (
                <p className="mt-1 text-sm text-gold-soft">{shop("personalization")}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <h3 className="card-title text-[1.75rem] text-foreground">{t("title")}</h3>
            <p className="mt-1.5 text-[0.9375rem] text-muted">{t("description")}</p>
          </div>
        )}

        {productOptions.length > 0 ? (
          <fieldset className="space-y-5">
            <legend className="mb-4 font-semibold text-foreground">{t("optionsTitle")}</legend>
            <div className="grid gap-5 md:grid-cols-2">{productOptions.map(renderOptionField)}</div>
          </fieldset>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <FieldShell label={t("fields.name")} error={fieldError("name")} errorId="name-error">
            <input
              {...register("name")}
              id="name"
              className="site-form-control"
              placeholder={t("placeholders.name")}
              autoComplete="name"
              aria-describedby={errors.name ? "name-error" : undefined}
              aria-invalid={Boolean(errors.name)}
            />
          </FieldShell>
          <FieldShell label={t("fields.phone")} error={fieldError("phone")} errorId="phone-error">
            <input
              {...register("phone")}
              id="phone"
              className="site-form-control"
              placeholder={t("placeholders.phone")}
              autoComplete="tel"
              dir="ltr"
              inputMode="tel"
              type="tel"
              aria-describedby={errors.phone ? "phone-error" : undefined}
              aria-invalid={Boolean(errors.phone)}
            />
          </FieldShell>
        </div>

        <FieldShell label={t("fields.email")} error={fieldError("email")} errorId="email-error">
          <input
            {...register("email")}
            id="email"
            dir="ltr"
            type="email"
            className="site-form-control"
            placeholder={t("placeholders.email")}
            autoComplete="email"
            aria-describedby={errors.email ? "email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
          />
        </FieldShell>

        <FieldShell label={t("fields.message")} error={fieldError("message")} errorId="message-error">
          <textarea
            {...register("message")}
            id="message"
            className="site-form-control resize-y"
            rows={6}
            placeholder={t("placeholders.message")}
            aria-describedby={errors.message ? "message-error" : undefined}
            aria-invalid={Boolean(errors.message)}
          />
        </FieldShell>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-soft">{t("allRequired")}</p>
          <button type="submit" disabled={isSubmitting} className="gold-button">
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSubmitting ? t("submitPending") : t("submit")}
          </button>
        </div>

        {submissionState !== "idle" ? (
          <p
            role="status"
            className={clsx(
              "rounded-xl border px-4 py-3 text-sm",
              submissionState === "success"
                ? "border-gold/30 bg-gold/10 text-gold-soft"
                : "border-rose-400/30 bg-rose-400/10 text-rose-200"
            )}
          >
            {submissionState === "success" ? t("success") : t("error")}
          </p>
        ) : null}
      </form>
    </div>
  );
}
