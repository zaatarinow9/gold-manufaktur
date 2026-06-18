"use client";

import clsx from "clsx";
import { LoaderCircle, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
} from "@/lib/admin/clientForm";

type SubmissionState = "error" | "idle" | "success";
type TrackingSupportField = "email" | "message" | "name" | "phone";
type FieldErrors = Partial<Record<TrackingSupportField, string>>;

type TrackingSupportFormProps = {
  trackingNumber: string;
};

function getTrackingSupportCopy(locale: string) {
  if (locale === "de") {
    return {
      emailInvalid: "Bitte geben Sie eine gueltige E-Mail-Adresse ein.",
      messageInvalid: "Bitte beschreiben Sie Ihr Anliegen mit mindestens 10 Zeichen.",
      nameRequired: "Bitte geben Sie Ihren Namen ein.",
      phoneInvalid: "Bitte geben Sie eine gueltige Telefonnummer ein.",
    };
  }

  if (locale === "ar") {
    return {
      emailInvalid:
        "\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0628\u0631\u064a\u062f \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0635\u062d\u064a\u062d.",
      messageInvalid:
        "\u064a\u0631\u062c\u0649 \u0648\u0635\u0641 \u0637\u0644\u0628\u0643 \u0628\u0645\u0627 \u0644\u0627 \u064a\u0642\u0644 \u0639\u0646 10 \u0623\u062d\u0631\u0641.",
      nameRequired:
        "\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0633\u0645\u0643.",
      phoneInvalid:
        "\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062a\u0641 \u0635\u062d\u064a\u062d.",
    };
  }

  return {
    emailInvalid: "Please enter a valid email address.",
    messageInvalid: "Please describe your request in at least 10 characters.",
    nameRequired: "Please enter your name.",
    phoneInvalid: "Please enter a valid phone number.",
  };
}

function mapApiFieldErrors(
  fieldErrors:
    | Partial<
        Record<
          "customerEmail" | "customerName" | "customerPhone" | "message",
          string[]
        >
      >
    | undefined,
  localeCopy: ReturnType<typeof getTrackingSupportCopy>
): FieldErrors {
  return {
    email: fieldErrors?.customerEmail?.length ? localeCopy.emailInvalid : undefined,
    message: fieldErrors?.message?.length ? localeCopy.messageInvalid : undefined,
    name: fieldErrors?.customerName?.length ? localeCopy.nameRequired : undefined,
    phone: fieldErrors?.customerPhone?.length ? localeCopy.phoneInvalid : undefined,
  };
}

export function TrackingSupportForm({
  trackingNumber,
}: TrackingSupportFormProps) {
  const t = useTranslations("Tracking.support");
  const formT = useTranslations("Contact.form");
  const locale = useLocale();
  const copy = getTrackingSupportCopy(locale);
  const requiredLabel = getRequiredFieldBadge(locale);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClassName =
    "w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3.5 text-start text-sm text-foreground outline-none transition placeholder:text-text-soft focus:border-gold/40 focus:bg-black/40";

  const clearFieldError = (field: TrackingSupportField) => {
    setFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const nextState = { ...current };
      delete nextState[field];
      return nextState;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionState("idle");

    const nextErrors: FieldErrors = {};

    if (name.trim().length === 0) {
      nextErrors.name = copy.nameRequired;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim())) {
      nextErrors.email = copy.emailInvalid;
    }

    if (phone.trim().length > 0 && phone.replace(/[^\d+]/gu, "").length < 6) {
      nextErrors.phone = copy.phoneInvalid;
    }

    if (message.trim().length < 10) {
      nextErrors.message = copy.messageInvalid;
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors as Record<string, string>);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tracking/${trackingNumber}/tickets`, {
        body: JSON.stringify({
          customerEmail: email,
          customerName: name,
          customerPhone: phone,
          message,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            fieldErrors?: Partial<
              Record<
                "customerEmail" | "customerName" | "customerPhone" | "message",
                string[]
              >
            >;
            success?: boolean;
          }
        | null;

      if (!response.ok || !payload?.success) {
        const apiErrors = mapApiFieldErrors(payload?.fieldErrors, copy);
        setFieldErrors(apiErrors);

        if (Object.values(apiErrors).some(Boolean)) {
          focusFirstInvalidField(apiErrors as Record<string, string>);
        }

        setSubmissionState("error");
        return;
      }

      setEmail("");
      setMessage("");
      setName("");
      setPhone("");
      setFieldErrors({});
      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="luxury-panel px-6 py-8 sm:px-8">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("description")}</p>
      </div>

      <form className="space-y-5 text-start" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-foreground">
            <span>
              {formT("fields.name")}
              <span className="ms-2 text-[0.72rem] text-muted">{requiredLabel}</span>
            </span>
            <input
              id="name"
              name="name"
              className={clsx(
                inputClassName,
                fieldErrors.name && "border-rose-400/40 focus:border-rose-300/60"
              )}
              value={name}
              onChange={(event) => {
                clearFieldError("name");
                setName(event.target.value);
              }}
              placeholder={formT("placeholders.name")}
              autoComplete="name"
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
              aria-invalid={Boolean(fieldErrors.name)}
              required
            />
            {fieldErrors.name ? (
              <span id="name-error" className="text-xs text-rose-300">
                {fieldErrors.name}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-foreground">
            <span>
              {formT("fields.email")}
              <span className="ms-2 text-[0.72rem] text-muted">{requiredLabel}</span>
            </span>
            <input
              id="email"
              name="email"
              className={clsx(
                inputClassName,
                fieldErrors.email && "border-rose-400/40 focus:border-rose-300/60"
              )}
              value={email}
              onChange={(event) => {
                clearFieldError("email");
                setEmail(event.target.value);
              }}
              placeholder={formT("placeholders.email")}
              autoComplete="email"
              type="email"
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              aria-invalid={Boolean(fieldErrors.email)}
              required
            />
            {fieldErrors.email ? (
              <span id="email-error" className="text-xs text-rose-300">
                {fieldErrors.email}
              </span>
            ) : null}
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-foreground">
          <span>{formT("fields.phone")}</span>
          <input
            id="phone"
            name="phone"
            className={clsx(
              inputClassName,
              fieldErrors.phone && "border-rose-400/40 focus:border-rose-300/60"
            )}
            value={phone}
            onChange={(event) => {
              clearFieldError("phone");
              setPhone(event.target.value);
            }}
            placeholder={formT("placeholders.phone")}
            autoComplete="tel"
            dir="ltr"
            inputMode="tel"
            type="tel"
            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          {fieldErrors.phone ? (
            <span id="phone-error" className="text-xs text-rose-300">
              {fieldErrors.phone}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-foreground">
          <span>
            {formT("fields.message")}
            <span className="ms-2 text-[0.72rem] text-muted">{requiredLabel}</span>
          </span>
          <textarea
            id="message"
            name="message"
            className={clsx(
              inputClassName,
              "min-h-44 resize-y",
              fieldErrors.message && "border-rose-400/40 focus:border-rose-300/60"
            )}
            value={message}
            onChange={(event) => {
              clearFieldError("message");
              setMessage(event.target.value);
            }}
            placeholder={formT("placeholders.message")}
            aria-describedby={fieldErrors.message ? "message-error" : undefined}
            aria-invalid={Boolean(fieldErrors.message)}
            required
          />
          {fieldErrors.message ? (
            <span id="message-error" className="text-xs text-rose-300">
              {fieldErrors.message}
            </span>
          ) : null}
        </label>

        <button type="submit" disabled={isSubmitting} className="gold-button">
          {isSubmitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isSubmitting ? formT("submitPending") : formT("submit")}
        </button>

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
  );
}
