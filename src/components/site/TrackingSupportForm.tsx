"use client";

import clsx from "clsx";
import { LoaderCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type SubmissionState = "error" | "idle" | "success";

type TrackingSupportFormProps = {
  trackingNumber: string;
};

export function TrackingSupportForm({
  trackingNumber,
}: TrackingSupportFormProps) {
  const t = useTranslations("Tracking.support");
  const formT = useTranslations("Contact.form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputClassName =
    "w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3.5 text-start text-sm text-foreground outline-none transition placeholder:text-text-soft focus:border-gold/40 focus:bg-black/40";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmissionState("idle");

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
        | { success?: boolean }
        | null;

      if (!response.ok || !payload?.success) {
        setSubmissionState("error");
        return;
      }

      setEmail("");
      setMessage("");
      setName("");
      setPhone("");
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
            <span>{formT("fields.name")}</span>
            <input
              className={inputClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={formT("placeholders.name")}
              autoComplete="name"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-foreground">
            <span>{formT("fields.email")}</span>
            <input
              className={inputClassName}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={formT("placeholders.email")}
              autoComplete="email"
              type="email"
              required
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-foreground">
          <span>{formT("fields.phone")}</span>
          <input
            className={inputClassName}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={formT("placeholders.phone")}
            autoComplete="tel"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-foreground">
          <span>{formT("fields.message")}</span>
          <textarea
            className={clsx(inputClassName, "min-h-44 resize-y")}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={formT("placeholders.message")}
            required
          />
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
