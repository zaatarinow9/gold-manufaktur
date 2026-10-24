"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

export function TrackingLookupForm() {
  const t = useTranslations("Tracking.lookup");
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedValue = trackingNumber.trim().toUpperCase();
    if (!normalizedValue) {
      setError(t("emptyError"));
      return;
    }
    setError("");
    router.push(`/tracking/${encodeURIComponent(normalizedValue)}`);
  };

  return (
    <form className="text-start" noValidate onSubmit={handleSubmit}>
      <label htmlFor="tracking-number" className="site-field-label">
        {t("label")}
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="tracking-number"
          className="site-form-control font-medium tracking-wide sm:flex-1"
          dir="ltr"
          value={trackingNumber}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "tracking-number-error" : undefined}
          onChange={(event) => {
            if (error) setError("");
            setTrackingNumber(event.target.value);
          }}
          placeholder={t("placeholder")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <button type="submit" className="gold-button">
          <Search className="h-4 w-4" />
          {t("submit")}
        </button>
      </div>
      {error ? (
        <p id="tracking-number-error" role="alert" className="site-field-error mt-2">
          {error}
        </p>
      ) : null}
    </form>
  );
}
