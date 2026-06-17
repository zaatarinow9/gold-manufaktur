"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import {
  getCategoryBySlug,
  realProductImages,
  type CatalogCategory,
  type CatalogProduct,
} from "@/data/catalog";
import { trimDisplayHeading } from "@/lib/displayText";

import { CategoryFilter } from "./CategoryFilter";
import { ProductCard } from "./ProductCard";
import { ProductGalleryModal } from "./ProductGalleryModal";

type ProductGridProps = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
};

export function ProductGrid({ categories, products }: ProductGridProps) {
  const t = useTranslations("Shop.grid");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(
    null
  );

  const filteredProducts =
    activeCategory === "all"
      ? products
      : products.filter((product) => product.categorySlug === activeCategory);

  const filterItems = [
    { slug: "all", label: t("all") },
    ...categories.map((category) => ({
      slug: category.slug,
      label: category.name,
    })),
  ];

  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="content-shell min-w-0 space-y-8">
          <div className="min-w-0 flex flex-col gap-4">
            <div>
              <p className="eyebrow">{t("eyebrow")}</p>
              <h2 className="card-title mt-5 text-4xl text-foreground sm:text-5xl">
                {trimDisplayHeading(t("title"))}
              </h2>
            </div>
          </div>

          <CategoryFilter
            activeCategory={activeCategory}
            categories={filterItems}
            onSelect={setActiveCategory}
          />

          {filteredProducts.length > 0 ? (
            <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const category = getCategoryBySlug(product.categorySlug);

                return (
                  <ProductCard
                    key={product.id}
                    categoryName={category?.name ?? product.categorySlug}
                    onOpen={() => setSelectedProduct(product)}
                    product={product}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rtl-mirror-grid grid min-w-0 gap-6 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,13,0.92),rgba(9,9,9,0.96))] lg:grid-cols-[0.78fr_1fr]">
              <div className="relative min-h-[22rem] overflow-hidden">
                <Image
                  src={realProductImages[6].src}
                  alt={realProductImages[6].alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1023px) 100vw, 34vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/24 to-transparent" />
              </div>

              <div className="min-w-0 flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-10">
                <span className="gold-chip">{t("emptyBadge")}</span>
                <h3 className="card-title mt-6 text-4xl text-foreground sm:text-5xl">
                  {trimDisplayHeading(t("emptyTitle"))}
                </h3>
                <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">
                  {t("emptyText")}
                </p>
              </div>
            </div>
          )}

          <ProductGalleryModal
            category={
              selectedProduct
                ? getCategoryBySlug(selectedProduct.categorySlug)
                : undefined
            }
            onClose={() => setSelectedProduct(null)}
            product={selectedProduct}
          />
        </div>
      </div>
    </section>
  );
}
