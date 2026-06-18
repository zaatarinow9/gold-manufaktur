"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { LoaderCircle, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
} from "@/lib/admin/clientForm";
import {
  contactInquiryDefaults,
  contactInquirySchema,
  type ContactInquiryInput,
} from "@/lib/contact";
import { SectionHeading } from "./SectionHeading";

type SubmissionState = "error" | "idle" | "success";

export function ContactForm() {
  const t = useTranslations("Contact.form");
  const locale = useLocale();
  const requiredLabel = getRequiredFieldBadge(locale);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");

  const getValidationMessage = (message?: string) =>
    message ? t(`validation.${message}`) : null;

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ContactInquiryInput>({
    defaultValues: contactInquiryDefaults,
    resolver: zodResolver(contactInquirySchema),
  });

  const onValid = async (values: ContactInquiryInput) => {
    setSubmissionState("idle");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
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

      reset(contactInquiryDefaults);
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
              title={t("title")}
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
