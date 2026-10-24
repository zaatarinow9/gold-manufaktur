"use client";

import { useTranslations } from "next-intl";

import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import type { CatalogProduct } from "@/types/catalog";

type ProductCardProps = {
  categoryName: string;
  onOpen: () => void;
  product: CatalogProduct;
};

/** Photo first, then category and name. The whole card opens the piece. */
export function ProductCard({ categoryName, onOpen, product }: ProductCardProps) {
  const t = useTranslations("Shop.card");

  return (
    <button type="button" onClick={onOpen} className="group block w-full min-w-0 text-start">
      <span className="media-frame relative block aspect-square">
        <LuxuryMedia
          src={product.imageUrl}
          alt={product.name}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
          imageClassName="transition duration-700 group-hover:scale-[1.04]"
        />
      </span>
      {categoryName ? <span className="mt-3 block truncate text-[0.8125rem] text-text-soft">{categoryName}</span> : null}
      <span className="card-title mt-1 block text-[1.2rem] text-foreground [overflow-wrap:anywhere] transition group-hover:text-gold-soft sm:text-[1.35rem]">
        {product.name}
      </span>
      {product.supportsNameCustomization ? (
        <span className="mt-1.5 block text-[0.8125rem] text-gold-soft">{t("personalization")}</span>
      ) : null}
    </button>
  );
}
