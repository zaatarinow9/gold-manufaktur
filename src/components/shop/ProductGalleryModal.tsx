"use client";

import clsx from "clsx";
import { MessageCircle, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import { Link } from "@/i18n/navigation";
import { companyInfo } from "@/lib/site";
import type { CatalogCategory, CatalogProduct } from "@/types/catalog";

type ProductGalleryModalProps = {
  category: CatalogCategory | undefined;
  onClose: () => void;
  product: CatalogProduct | null;
};

export function ProductGalleryModal({ category, onClose, product }: ProductGalleryModalProps) {
  const t = useTranslations("Shop");
  const closeRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<{ image: string; productId: string | null }>({ image: "", productId: null });

  useEffect(() => {
    if (!product) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose, product]);

  if (!product) return null;

  const images = product.gallery.length > 0 ? product.gallery : product.imageUrl ? [product.imageUrl] : [];
  const activeImage = selected.productId === product.id && selected.image ? selected.image : images[0] ?? "";
  const categoryName = category?.name ?? product.categoryName ?? t("modal.fallbackCategory");

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-dialog-title"
    >
      <button type="button" aria-label={t("modal.close")} tabIndex={-1} className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative z-10 flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[var(--radius-panel)] border border-[var(--border-strong)] bg-surface shadow-2xl sm:rounded-[var(--radius-panel)]">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("modal.close")}
          className="absolute end-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-foreground backdrop-blur transition hover:bg-black/75"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid min-h-0 overflow-y-auto overscroll-contain md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="min-w-0">
            <div className="relative aspect-square bg-surface-strong">
              <LuxuryMedia src={activeImage} alt={product.name} sizes="(min-width: 768px) 55vw, 100vw" />
            </div>
            {images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto p-3" role="group" aria-label={t("modal.galleryLabel")}>
                {images.map((image, index) => {
                  const isActive = image === activeImage;
                  return (
                    <button
                      key={`${product.id}-${image}-${index}`}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={`${product.name} ${index + 1}`}
                      onClick={() => setSelected({ image, productId: product.id })}
                      className={clsx(
                        "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition",
                        isActive ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"
                      )}
                    >
                      <LuxuryMedia src={image} alt="" sizes="64px" />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col p-6 sm:p-8">
            <p className="text-sm text-gold-soft">{categoryName}</p>
            <h2 id="product-dialog-title" className="card-title mt-1.5 text-3xl text-foreground [overflow-wrap:anywhere] sm:text-4xl">
              {product.name}
            </h2>
            {product.shortDescription ? (
              <p className="section-copy mt-4 [overflow-wrap:anywhere]">{product.shortDescription}</p>
            ) : null}
            {product.supportsNameCustomization ? (
              <p className="mt-3 text-sm text-gold-soft">{t("card.personalization")}</p>
            ) : null}
            {product.tags.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label={t("modal.tagsLabel")}>
                {product.tags.map((tag) => (
                  <li key={tag} className="gold-chip">{tag}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <p className="font-medium text-foreground">{t("modal.noteTitle")}</p>
              <p className="mt-1 text-[0.9375rem] leading-7 text-muted">{t("modal.note")}</p>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3 pt-7">
              <Link href={`/contact?product=${encodeURIComponent(product.slug)}`} className="gold-button col-span-2">
                {t("modal.requestCta")}
              </Link>
              <a href={companyInfo.whatsappHref} target="_blank" rel="noreferrer" className="ghost-button">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a href={companyInfo.phoneHref} className="ghost-button">
                <Phone className="h-4 w-4" />
                {t("modal.callCta")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
