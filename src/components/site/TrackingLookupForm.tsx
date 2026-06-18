"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

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
    <form className="space-y-5 text-start" noValidate onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        <span>{t("label")}</span>
        <input
          className="w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3.5 text-start text-sm text-foreground outline-none transition placeholder:text-text-soft focus:border-gold/40 focus:bg-black/40"
          value={trackingNumber}
          onChange={(event) => {
            if (error) {
              setError("");
            }

            setTrackingNumber(event.target.value);
          }}
          placeholder={t("placeholder")}
          autoComplete="off"
        />
      </label>

      {error ? (
        <div className="rounded-[18px] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <button type="submit" className="gold-button">
        <Search className="h-4 w-4" />
        {t("submit")}
      </button>
    </form>
  );
}
