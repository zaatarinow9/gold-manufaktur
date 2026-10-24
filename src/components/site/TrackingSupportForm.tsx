"use client";

import clsx from "clsx";
import { LoaderCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { focusFirstInvalidField } from "@/lib/admin/clientForm";

type SubmissionState = "error" | "idle" | "success";
type TrackingSupportField = "email" | "message" | "name" | "phone";
type FieldErrors = Partial<Record<TrackingSupportField, string>>;

type TrackingSupportFormProps = {
  trackingNumber: string;
};

type SupportCopy = { emailInvalid: string; messageInvalid: string; nameRequired: string; phoneInvalid: string };

function mapApiFieldErrors(
  fieldErrors:
    | Partial<
        Record<
          "customerEmail" | "customerName" | "customerPhone" | "message",
          string[]
        >
      >
    | undefined,
  localeCopy: SupportCopy
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
  const copy: SupportCopy = {
    emailInvalid: formT("validation.email"),
    messageInvalid: t("messageMin"),
    nameRequired: formT("validation.name"),
    phoneInvalid: formT("validation.phone"),
  };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const field = (
    id: TrackingSupportField,
    label: string,
    control: React.ReactNode,
    optional = false
  ) => (
    <label className="site-field">
      <span className="site-field-label">
        {label}
        {optional ? <span className="site-field-optional">{formT("optional")}</span> : null}
      </span>
      {control}
      {fieldErrors[id] ? (
        <span id={`${id}-error`} role="alert" className="site-field-error">
          {fieldErrors[id]}
        </span>
      ) : null}
    </label>
  );

  const aria = (id: TrackingSupportField) => ({
    "aria-describedby": fieldErrors[id] ? `${id}-error` : undefined,
    "aria-invalid": Boolean(fieldErrors[id]),
    id,
  });

  return (
    <div className="luxury-panel p-5 sm:p-8">
      <h2 className="card-title text-[1.75rem] text-foreground">{t("title")}</h2>
      <p className="mt-1.5 text-[0.9375rem] text-muted">{t("description")}</p>

      <form className="mt-6 space-y-5 text-start" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-5 md:grid-cols-2">
          {field(
            "name",
            formT("fields.name"),
            <input
              {...aria("name")}
              className="site-form-control"
              value={name}
              autoComplete="name"
              placeholder={formT("placeholders.name")}
              onChange={(event) => {
                clearFieldError("name");
                setName(event.target.value);
              }}
            />
          )}
          {field(
            "email",
            formT("fields.email"),
            <input
              {...aria("email")}
              className="site-form-control"
              type="email"
              dir="ltr"
              value={email}
              autoComplete="email"
              placeholder={formT("placeholders.email")}
              onChange={(event) => {
                clearFieldError("email");
                setEmail(event.target.value);
              }}
            />
          )}
        </div>
        {field(
          "phone",
          formT("fields.phone"),
          <input
            {...aria("phone")}
            className="site-form-control"
            type="tel"
            dir="ltr"
            inputMode="tel"
            value={phone}
            autoComplete="tel"
            placeholder={formT("placeholders.phone")}
            onChange={(event) => {
              clearFieldError("phone");
              setPhone(event.target.value);
            }}
          />,
          true
        )}
        {field(
          "message",
          formT("fields.message"),
          <textarea
            {...aria("message")}
            className="site-form-control resize-y"
            rows={5}
            value={message}
            placeholder={formT("placeholders.message")}
            onChange={(event) => {
              clearFieldError("message");
              setMessage(event.target.value);
            }}
          />
        )}

        <button type="submit" disabled={isSubmitting} className="gold-button">
          {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isSubmitting ? formT("submitPending") : formT("submit")}
        </button>

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
