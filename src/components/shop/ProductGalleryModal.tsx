"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { CatalogCategory, CatalogProduct } from "@/data/catalog";

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

  const images = product.gallery.length > 0 ? product.gallery : [product.imageUrl];
  const activeImage =
    selectedImageState.productId === product.id && selectedImageState.image
      ? selectedImageState.image
      : images[0];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/82 px-4 py-6 backdrop-blur-xl"
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

      <div className="relative z-10 w-full max-w-7xl overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,12,0.96),rgba(8,8,8,0.98))] shadow-[0_38px_100px_rgba(0,0,0,0.46)]">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute end-4 top-4 z-20 rounded-full border border-white/10 bg-black/60 p-2 text-gold-soft transition hover:border-gold/40 hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="rtl-mirror-grid grid lg:grid-cols-[1.18fr_0.82fr]">
          <div className="border-b border-white/8 lg:border-b-0 lg:border-e lg:border-white/8">
            <div className="relative aspect-[4/5] bg-[radial-gradient(circle_at_30%_20%,rgba(232,201,135,0.18),transparent_40%),linear-gradient(180deg,#111,#050505)]">
              <Image
                src={activeImage}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1023px) 100vw, 60vw"
              />
            </div>

            <div className="flex gap-3 overflow-x-auto p-4 sm:p-5">
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
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6 p-6 text-start sm:p-8">
            <div className="space-y-4">
              <span className="gold-chip">{category?.name ?? t("fallbackCategory")}</span>
              <div>
                <h3 className="text-3xl font-semibold text-foreground sm:text-4xl">
                  {product.name}
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">
                  {product.shortDescription}
                </p>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/28 p-5">
              <p className="muted-label">{t("categoryLabel")}</p>
              <p className="mt-3 text-sm text-foreground sm:text-base">
                {category?.name ?? t("fallbackCategory")}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/28 p-5">
              <p className="muted-label">{t("tagsLabel")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/4 px-3 py-2 text-xs uppercase tracking-[0.18em] text-gold-soft"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/contact" className="gold-button">
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
