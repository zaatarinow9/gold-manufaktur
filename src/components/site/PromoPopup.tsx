"use client";

import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react";
import type { PublicPromoPopup } from "@/lib/db/siteSettings";

export function PromoPopup({ promo }: { promo: PublicPromoPopup }) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const now = Date.now();
    const valid = promo.enabled && promo.title && promo.description && (!promo.startsAt || Date.parse(promo.startsAt) <= now) && (!promo.endsAt || Date.parse(promo.endsAt) >= now);
    return Boolean(valid && (!promo.showOnce || !localStorage.getItem("goldhelwah-promo-dismissed")));
  });
  const [failedImageUrl, setFailedImageUrl] = useState("");
  const imageVisible = Boolean(promo.imageUrl) && failedImageUrl !== promo.imageUrl;

  if (!open) return null;
  const close = () => { if (promo.showOnce) localStorage.setItem("goldhelwah-promo-dismissed", "1"); setOpen(false); };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true"><section className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-gold/25 bg-[#0b0a08] p-6 shadow-2xl sm:p-8"><button type="button" aria-label="Close" onClick={close} className="absolute right-4 top-4 rounded-full p-2 text-muted hover:text-foreground"><X className="h-5 w-5" /></button>{promo.imageUrl && imageVisible ? <div className="relative mb-6 h-44 w-full overflow-hidden rounded-2xl"><Image src={promo.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 32rem" className="object-cover" onError={() => setFailedImageUrl(promo.imageUrl)} /></div> : null}<p className="eyebrow">GoldHelwah GmbH</p><h2 className="mt-4 text-3xl font-semibold text-foreground">{promo.title}</h2><p className="mt-4 leading-7 text-muted">{promo.description}</p>{promo.ctaText && promo.ctaUrl ? <a className="gold-button mt-6" href={promo.ctaUrl}>{promo.ctaText}</a> : null}{promo.videoUrl ? <a className="mt-4 block text-sm text-gold-soft underline" href={promo.videoUrl} target="_blank" rel="noreferrer">Video</a> : null}</section></div>;
}
