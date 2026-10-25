"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { ResolvedPromoPopup } from "@/lib/db/siteSettings";

const storageKey = "goldhelwah-promo-seen";

function isWithinPeriod(promo: ResolvedPromoPopup) {
  const now = Date.now();
  return (!promo.startsAt || Date.parse(promo.startsAt) <= now) && (!promo.endsAt || Date.parse(promo.endsAt) >= now);
}

function wasSeen(version: string) {
  try {
    return window.localStorage.getItem(storageKey) === version;
  } catch {
    return false;
  }
}

/** A quiet announcement shown once on the homepage, e.g. for a season or an event. */
export function PromoPopup({ promo }: { promo: ResolvedPromoPopup | null }) {
  const t = useTranslations("Promo");
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!promo || !isWithinPeriod(promo) || (promo.showOnce && wasSeen(promo.version))) return;
    // Let the page settle first; an instant pop-up feels like an ad.
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [promo]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!promo || !open) return null;

  const close = () => {
    if (promo.showOnce) {
      try {
        window.localStorage.setItem(storageKey, promo.version);
      } catch {
        // Without storage the pop-up may simply show again next time.
      }
    }
    setOpen(false);
  };

  const showImage = Boolean(promo.imageUrl) && !imageFailed;

  return (
    <div className="promo-layer" role="dialog" aria-modal="true" aria-labelledby="promo-title">
      <button type="button" className="promo-backdrop" aria-hidden="true" tabIndex={-1} onClick={close} />
      <section className="promo-card">
        <button ref={closeRef} type="button" aria-label={t("close")} onClick={close} className="promo-close">
          <X className="h-5 w-5" />
        </button>
        {showImage ? (
          <div className="promo-media">
            <Image src={promo.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 30rem" className="object-cover" onError={() => setImageFailed(true)} />
          </div>
        ) : null}
        <div className="promo-body">
          <h2 id="promo-title" className="promo-title">
            {promo.title}
          </h2>
          {promo.description ? <p className="promo-text">{promo.description}</p> : null}
          <div className="promo-actions">
            {promo.ctaText && promo.ctaUrl ? (
              <a className="gold-button" href={promo.ctaUrl} onClick={close}>
                {promo.ctaText}
              </a>
            ) : null}
            <button type="button" className="promo-dismiss" onClick={close}>
              {t("dismiss")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
