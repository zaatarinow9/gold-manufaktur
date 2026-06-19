"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import type { CatalogCategory, CatalogProduct } from "@/types/catalog";

type ProductGalleryModalProps = {
  category: CatalogCategory | undefined;
  onClose: () => void;
  product: CatalogProduct | null;
};

export function ProductGalleryModal({
  category,
  onClose,
  product,
}: ProductGalleryModalProps) {
  const t = useTranslations("Shop.modal");
  const locale = useLocale();
  const [selectedImageState, setSelectedImageState] = useState<{
    image: string;
    productId: string | null;
  }>({
    image: "",
    productId: null,
  });

  useEffect(() => {
    if (!product) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, product]);

  if (!product) {
    return null;
  }

  const images = product.gallery.length > 0
    ? product.gallery
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  const activeImage =
    selectedImageState.productId === product.id && selectedImageState.image
      ? selectedImageState.image
      : images[0] ?? "";
  const personalizationNote = locale === "ar"
    ? "يمكن تخصيص الاسم لهذا المنتج"
    : locale === "de"
      ? "Namenspersonalisierung moeglich"
      : locale === "fr"
        ? "Personnalisation du nom possible"
        : locale === "tr"
          ? "Isim kisilestirmesi mumkun"
          : "Name personalization available";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/82 px-4 py-4 backdrop-blur-xl sm:items-center sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <button
        type="button"
        aria-label={t("close")}
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,12,0.96),rgba(8,8,8,0.98))] shadow-[0_38px_100px_rgba(0,0,0,0.46)]">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute end-4 top-4 z-20 rounded-full border border-white/10 bg-black/60 p-2 text-gold-soft transition hover:border-gold/40 hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="rtl-mirror-grid grid min-h-0 overflow-y-auto overscroll-contain lg:grid-cols-[1.18fr_0.82fr]">
          <div className="min-w-0 border-b border-white/8 lg:border-b-0 lg:border-e lg:border-white/8">
            <div className="relative aspect-[4/4.5] bg-[radial-gradient(circle_at_30%_20%,rgba(232,201,135,0.18),transparent_40%),linear-gradient(180deg,#111,#050505)] sm:aspect-[4/5]">
              <LuxuryMedia
                src={activeImage}
                alt={product.name}
                sizes="(max-width: 1023px) 100vw, 60vw"
                fallbackContent={
                  <div className="absolute inset-x-5 bottom-5">
                    <span className="gold-chip">
                      {category?.name ?? t("fallbackCategory")}
                    </span>
                  </div>
                }
              />
            </div>

            {images.length > 0 ? (
              <div className="flex min-w-0 gap-3 overflow-x-auto p-4 sm:p-5">
                {images.map((image, index) => {
                  const isActive = image === activeImage;

                  return (
                    <button
                      key={`${product.id}-${image}-${index}`}
                      type="button"
                      onClick={() =>
                        setSelectedImageState({ image, productId: product.id })
                      }
                      className={`relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl border transition ${
                        isActive
                          ? "border-gold/50 shadow-[0_18px_35px_rgba(196,154,82,0.18)]"
                          : "border-white/10 hover:border-gold/30"
                      }`}
                    >
                      <LuxuryMedia
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        sizes="80px"
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 sm:p-5">
                <div className="rounded-[24px] border border-white/10 bg-black/24 px-5 py-5 text-start">
                  <span className="gold-chip">{category?.name ?? t("fallbackCategory")}</span>
                  <p className="mt-4 text-sm leading-6 text-muted">
                    {product.shortDescription}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-6 p-6 text-start sm:p-8">
            <div className="min-w-0 space-y-4">
              <span className="gold-chip">{category?.name ?? t("fallbackCategory")}</span>
              <div>
                <h3 className="text-3xl font-semibold text-foreground [overflow-wrap:anywhere] sm:text-4xl">
                  {product.name}
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted [overflow-wrap:anywhere] sm:text-base">
                  {product.shortDescription}
                </p>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/28 p-5">
              <p className="muted-label">{t("categoryLabel")}</p>
              <p className="mt-3 text-sm text-foreground [overflow-wrap:anywhere] sm:text-base">
                {category?.name ?? t("fallbackCategory")}
              </p>
              {product.supportsNameCustomization ? (
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-gold-soft">
                  {personalizationNote}
                </p>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/28 p-5">
              <p className="muted-label">{t("tagsLabel")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="max-w-full rounded-full border border-white/10 bg-white/4 px-3 py-2 text-xs uppercase tracking-[0.18em] text-gold-soft [overflow-wrap:anywhere]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rtl-inline-row flex flex-wrap gap-3">
              <Link
                href={`/contact?product=${encodeURIComponent(product.slug)}`}
                className="gold-button"
              >
                {t("requestCta")}
              </Link>
              <button type="button" onClick={onClose} className="ghost-button">
                {t("backCta")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
