"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { LoaderCircle, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import type { CatalogProduct } from "@/types/catalog";
import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
} from "@/lib/admin/clientForm";
import {
  contactInquiryDefaults,
  contactInquirySchema,
  type ContactInquiryInput,
} from "@/lib/contact";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import { SectionHeading } from "./SectionHeading";

type SubmissionState = "error" | "idle" | "success";

type ContactFormProps = {
  product?: CatalogProduct | null;
};

type OptionFieldValue = boolean | number | string | string[];

function getProductDefaultMessage(locale: string) {
  if (locale === "ar") {
    return "أنا مهتم بهذا المنتج وأرغب بالحصول على مزيد من التفاصيل.";
  }

  if (locale === "de") {
    return "Ich interessiere mich fuer dieses Schmuckstueck und wuensche weitere Informationen.";
  }

  return "I am interested in this piece and would like to receive more information.";
}

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

function getProductFormCopy(locale: string) {
  if (locale === "ar") {
    return {
      optionsTitle: "تفاصيل الطلب",
      productTitle: "المنتج المحدد",
      requiredField: "يرجى تعبئة هذا الحقل.",
      requestTitle: "طلب هذا المنتج",
    };
  }

  if (locale === "de") {
    return {
      optionsTitle: "Anfrage-Details",
      productTitle: "Ausgewaehltes Produkt",
      requiredField: "Bitte fuellen Sie dieses Pflichtfeld aus.",
      requestTitle: "Anfrage zu diesem Produkt",
    };
  }

  return {
    optionsTitle: "Request details",
    productTitle: "Selected product",
    requiredField: "Please complete this required field.",
    requestTitle: "Request this product",
  };
}

export function ContactForm({ product }: ContactFormProps) {
  const t = useTranslations("Contact.form");
  const locale = useLocale();
  const copy = getProductFormCopy(locale);
  const requiredLabel = getRequiredFieldBadge(locale);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [optionValues, setOptionValues] = useState<Record<string, OptionFieldValue>>({});
  const [optionErrors, setOptionErrors] = useState<Record<string, string>>({});

  const defaultMessage = useMemo(
    () => (product ? getProductDefaultMessage(locale) : contactInquiryDefaults.message),
    [locale, product]
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

          return [[field.id, copy.requiredField]];
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

  const inputClassName =
    "w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3.5 text-start text-sm text-foreground outline-none transition placeholder:text-text-soft focus:border-gold/40 focus:bg-black/40";

  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="content-shell grid gap-6 xl:grid-cols-[0.62fr_1.38fr] xl:items-stretch">
          <div className="luxury-panel flex h-full flex-col justify-center px-6 py-8 sm:px-8">
            <SectionHeading
              eyebrow={t("eyebrow")}
              title={product ? copy.requestTitle : t("title")}
              description={t("description")}
              titleClassName="text-4xl sm:text-5xl"
              descriptionClassName="max-w-md text-base leading-7"
            />
          </div>

          <div className="luxury-panel px-6 py-8 sm:px-8">
            <form
              className="space-y-5 text-start"
              noValidate
              onSubmit={handleSubmit(onValid, onInvalid)}
            >
              {product ? (
                <div className="rounded-[26px] border border-white/10 bg-black/20 p-4 sm:p-5">
                  <p className="muted-label">{copy.productTitle}</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-[140px_1fr]">
                    <div className="relative aspect-[4/4.6] overflow-hidden rounded-[20px] border border-white/10 bg-black/30">
                      <LuxuryMedia
                        src={product.imageUrl}
                        alt={product.name}
                        sizes="140px"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-gold-soft">
                        {product.categoryName}
                      </p>
                      <h3 className="text-2xl font-semibold text-foreground">
                        {product.name}
                      </h3>
                      <p className="text-sm leading-6 text-muted">
                        {product.shortDescription}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {productOptions.length > 0 ? (
                <div className="rounded-[26px] border border-white/10 bg-black/20 p-4 sm:p-5">
                  <p className="muted-label">{copy.optionsTitle}</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {productOptions.map((field) => {
                      const errorText = optionErrors[field.id];
                      const helperText = field.helpText || field.placeholder;
                      const commonWrapperClass = "flex flex-col gap-2 text-sm text-foreground";
                      const currentValue = optionValues[field.id];

                      if (field.type === "textarea") {
                        return (
                          <label key={field.id} className={commonWrapperClass}>
                            <span>
                              {field.label}
                              {field.isRequired ? (
                                <span className="ms-2 text-[0.72rem] text-muted">
                                  {requiredLabel}
                                </span>
                              ) : null}
                            </span>
                            <textarea
                              className={clsx(
                                inputClassName,
                                "min-h-32 resize-y",
                                errorText && "border-rose-400/40 focus:border-rose-300/60"
                              )}
                              value={typeof currentValue === "string" ? currentValue : ""}
                              placeholder={field.placeholder}
                              onChange={(event) => {
                                setOptionErrors((current) => {
                                  const next = { ...current };
                                  delete next[field.id];
                                  return next;
                                });
                                setOptionValues((current) => ({
                                  ...current,
                                  [field.id]: event.target.value,
                                }));
                              }}
                            />
                            {helperText ? <span className="text-xs text-muted">{helperText}</span> : null}
                            {errorText ? <span className="text-xs text-rose-300">{errorText}</span> : null}
                          </label>
                        );
                      }

                      if (field.type === "select") {
                        return (
                          <label key={field.id} className={commonWrapperClass}>
                            <span>
                              {field.label}
                              {field.isRequired ? (
                                <span className="ms-2 text-[0.72rem] text-muted">
                                  {requiredLabel}
                                </span>
                              ) : null}
                            </span>
                            <select
                              className={clsx(
                                inputClassName,
                                errorText && "border-rose-400/40 focus:border-rose-300/60"
                              )}
                              value={typeof currentValue === "string" ? currentValue : ""}
                              onChange={(event) => {
                                setOptionErrors((current) => {
                                  const next = { ...current };
                                  delete next[field.id];
                                  return next;
                                });
                                setOptionValues((current) => ({
                                  ...current,
                                  [field.id]: event.target.value,
                                }));
                              }}
                            >
                              <option value="">{field.placeholder || field.label}</option>
                              {field.values.map((value) => (
                                <option key={`${field.id}-${value.value}`} value={value.value}>
                                  {value.label}
                                </option>
                              ))}
                            </select>
                            {helperText ? <span className="text-xs text-muted">{helperText}</span> : null}
                            {errorText ? <span className="text-xs text-rose-300">{errorText}</span> : null}
                          </label>
                        );
                      }

                      if (field.type === "multi_select") {
                        const selectedValues = Array.isArray(currentValue)
                          ? currentValue
                          : [];

                        return (
                          <div key={field.id} className={commonWrapperClass}>
                            <span>
                              {field.label}
                              {field.isRequired ? (
                                <span className="ms-2 text-[0.72rem] text-muted">
                                  {requiredLabel}
                                </span>
                              ) : null}
                            </span>
                            <div className="rounded-[22px] border border-white/10 bg-black/30 px-4 py-4">
                              <div className="flex flex-wrap gap-3">
                                {field.values.map((value) => {
                                  const isChecked = selectedValues.includes(value.value);

                                  return (
                                    <label
                                      key={`${field.id}-${value.value}`}
                                      className="rtl-inline-row flex items-center gap-2 text-sm text-foreground"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(event) => {
                                          setOptionErrors((current) => {
                                            const next = { ...current };
                                            delete next[field.id];
                                            return next;
                                          });
                                          setOptionValues((current) => {
                                            const existing = Array.isArray(current[field.id])
                                              ? (current[field.id] as string[])
                                              : [];
                                            return {
                                              ...current,
                                              [field.id]: event.target.checked
                                                ? [...existing, value.value]
                                                : existing.filter((item) => item !== value.value),
                                            };
                                          });
                                        }}
                                        className="h-4 w-4 accent-[#c49a52]"
                                      />
                                      {value.label}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                            {helperText ? <span className="text-xs text-muted">{helperText}</span> : null}
                            {errorText ? <span className="text-xs text-rose-300">{errorText}</span> : null}
                          </div>
                        );
                      }

                      if (field.type === "boolean") {
                        return (
                          <div key={field.id} className={commonWrapperClass}>
                            <span>{field.label}</span>
                            <label className="rtl-inline-row flex items-center gap-2 rounded-[22px] border border-white/10 bg-black/30 px-4 py-3.5 text-sm text-foreground">
                              <input
                                type="checkbox"
                                checked={optionValues[field.id] === true}
                                onChange={(event) => {
                                  setOptionErrors((current) => {
                                    const next = { ...current };
                                    delete next[field.id];
                                    return next;
                                  });
                                  setOptionValues((current) => ({
                                    ...current,
                                    [field.id]: event.target.checked,
                                  }));
                                }}
                                className="h-4 w-4 accent-[#c49a52]"
                              />
                              {field.helpText || field.label}
                            </label>
                            {errorText ? <span className="text-xs text-rose-300">{errorText}</span> : null}
                          </div>
                        );
                      }

                      return (
                        <label key={field.id} className={commonWrapperClass}>
                          <span>
                            {field.label}
                            {field.isRequired ? (
                              <span className="ms-2 text-[0.72rem] text-muted">
                                {requiredLabel}
                              </span>
                            ) : null}
                          </span>
                          <input
                            className={clsx(
                              inputClassName,
                              errorText && "border-rose-400/40 focus:border-rose-300/60"
                            )}
                            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                            value={
                              typeof currentValue === "number"
                                ? String(currentValue)
                                : typeof currentValue === "string"
                                  ? currentValue
                                  : ""
                            }
                            placeholder={field.placeholder}
                            onChange={(event) => {
                              setOptionErrors((current) => {
                                const next = { ...current };
                                delete next[field.id];
                                return next;
                              });
                              setOptionValues((current) => ({
                                ...current,
                                [field.id]:
                                  field.type === "number"
                                    ? event.target.value
                                    : event.target.value,
                              }));
                            }}
                          />
                          {helperText ? <span className="text-xs text-muted">{helperText}</span> : null}
                          {errorText ? <span className="text-xs text-rose-300">{errorText}</span> : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-foreground">
                  <span>
                    {t("fields.name")}
                    <span className="ms-2 text-[0.72rem] text-muted">{requiredLabel}</span>
                  </span>
                  <input
                    {...register("name")}
                    id="name"
                    className={clsx(
                      inputClassName,
                      errors.name && "border-rose-400/40 focus:border-rose-300/60"
                    )}
                    placeholder={t("placeholders.name")}
                    autoComplete="name"
                    aria-describedby={errors.name ? "name-error" : undefined}
                    aria-invalid={Boolean(errors.name)}
                  />
                  {getValidationMessage(errors.name?.message) ? (
                    <span id="name-error" className="text-xs text-rose-300">
                      {getValidationMessage(errors.name?.message)}
                    </span>
                  ) : null}
                </label>

                <label className="flex flex-col gap-2 text-sm text-foreground">
                  <span>
                    {t("fields.email")}
                    <span className="ms-2 text-[0.72rem] text-muted">{requiredLabel}</span>
                  </span>
                  <input
                    {...register("email")}
                    id="email"
                    className={clsx(
                      inputClassName,
                      errors.email && "border-rose-400/40 focus:border-rose-300/60"
                    )}
                    placeholder={t("placeholders.email")}
                    autoComplete="email"
                    aria-describedby={errors.email ? "email-error" : undefined}
                    aria-invalid={Boolean(errors.email)}
                  />
                  {getValidationMessage(errors.email?.message) ? (
                    <span id="email-error" className="text-xs text-rose-300">
                      {getValidationMessage(errors.email?.message)}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm text-foreground">
                <span>
                  {t("fields.phone")}
                  <span className="ms-2 text-[0.72rem] text-muted">{requiredLabel}</span>
                </span>
                <input
                  {...register("phone")}
                  id="phone"
                  className={clsx(
                    inputClassName,
                    errors.phone && "border-rose-400/40 focus:border-rose-300/60"
                  )}
                  placeholder={t("placeholders.phone")}
                  autoComplete="tel"
                  dir="ltr"
                  inputMode="tel"
                  type="tel"
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                  aria-invalid={Boolean(errors.phone)}
                />
                {getValidationMessage(errors.phone?.message) ? (
                  <span id="phone-error" className="text-xs text-rose-300">
                    {getValidationMessage(errors.phone?.message)}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-2 text-sm text-foreground">
                <span>
                  {t("fields.message")}
                  <span className="ms-2 text-[0.72rem] text-muted">{requiredLabel}</span>
                </span>
                <textarea
                  {...register("message")}
                  id="message"
                  className={clsx(
                    inputClassName,
                    "min-h-44 resize-y",
                    errors.message && "border-rose-400/40 focus:border-rose-300/60"
                  )}
                  placeholder={t("placeholders.message")}
                  aria-describedby={errors.message ? "message-error" : undefined}
                  aria-invalid={Boolean(errors.message)}
                />
                {getValidationMessage(errors.message?.message) ? (
                  <span id="message-error" className="text-xs text-rose-300">
                    {getValidationMessage(errors.message?.message)}
                  </span>
                ) : null}
              </label>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" disabled={isSubmitting} className="gold-button">
                  {isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isSubmitting ? t("submitPending") : t("submit")}
                </button>
              </div>

              {submissionState !== "idle" ? (
                <div
                  className={clsx(
                    "rounded-[20px] border px-4 py-3 text-sm",
                    submissionState === "success"
                      ? "border-gold/25 bg-gold/10 text-gold-soft"
                      : "border-rose-400/25 bg-rose-400/10 text-rose-200"
                  )}
                >
                  {submissionState === "success" ? t("success") : t("error")}
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
