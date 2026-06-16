"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CatalogProduct } from "@/data/catalog";

type ProductCardProps = {
  categoryName: string;
  onOpen: () => void;
  product: CatalogProduct;
};

export function ProductCard({
  categoryName,
  onOpen,
  product,
}: ProductCardProps) {
  const t = useTranslations("Shop.card");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,15,11,0.92),rgba(8,8,8,0.98))] text-start transition hover:-translate-y-1 hover:border-gold/30"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
          sizes="(max-width: 767px) 100vw, (max-width: 1535px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.86))]" />

        <div className="rtl-inline-row absolute inset-x-4 top-4 flex items-start justify-between gap-3">
          <span className="gold-chip !py-2">{categoryName}</span>
          <span className="rounded-full border border-white/10 bg-black/45 p-2 text-gold-soft backdrop-blur">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="space-y-3 px-5 py-5">
        <h3 className="text-lg font-semibold text-foreground sm:text-xl">
          {product.name}
        </h3>
        <p className="text-sm leading-6 text-muted">{product.shortDescription}</p>
        <span className="rtl-inline-row inline-flex items-center gap-2 text-sm font-medium text-gold-soft transition group-hover:text-foreground">
          {t("cta")}
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}
