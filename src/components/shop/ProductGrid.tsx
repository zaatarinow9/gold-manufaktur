"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";
import { companyInfo } from "@/lib/site";
import type { CatalogCategory, CatalogProduct } from "@/types/catalog";

import { CategoryFilter } from "./CategoryFilter";
import { ProductCard } from "./ProductCard";
import { ProductGalleryModal } from "./ProductGalleryModal";

type ProductGridProps = {
  categories: CatalogCategory[];
  initialCategory?: string;
  initialProduct?: string;
  products: CatalogProduct[];
};

/** Keep ?category= and ?product= in the address bar so a view can be shared. */
function syncQuery(key: "category" | "product", value: string | null) {
  try {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url);
  } catch {
    // Address bar sync is a convenience only.
  }
}

export function ProductGrid({ categories, initialCategory, initialProduct, products }: ProductGridProps) {
  const t = useTranslations("Shop");
  const nav = useTranslations("Nav");

  const knownCategory = categories.some((category) => category.slug === initialCategory);
  const [activeCategory, setActiveCategory] = useState(knownCategory ? initialCategory! : "all");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(
    () => products.find((product) => product.slug === initialProduct || product.id === initialProduct) ?? null
  );

  const categoryBySlug = useMemo(() => new Map(categories.map((category) => [category.slug, category])), [categories]);

  // Only categories that have pieces are offered as filters, plus the one the visitor came for.
  const filterItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) counts.set(product.categorySlug, (counts.get(product.categorySlug) ?? 0) + 1);
    return [
      { count: products.length, label: t("grid.all"), slug: "all" },
      ...categories
        .filter((category) => counts.has(category.slug) || category.slug === activeCategory)
        .map((category) => ({ count: counts.get(category.slug) ?? 0, label: category.name, slug: category.slug })),
    ];
  }, [activeCategory, categories, products, t]);

  const filteredProducts =
    activeCategory === "all" ? products : products.filter((product) => product.categorySlug === activeCategory);
  const activeCategoryName = activeCategory === "all" ? null : categoryBySlug.get(activeCategory)?.name;

  const selectCategory = (slug: string) => {
    setActiveCategory(slug);
    syncQuery("category", slug === "all" ? null : slug);
  };

  const openProduct = (product: CatalogProduct) => {
    setSelectedProduct(product);
    syncQuery("product", product.slug);
  };

  const closeProduct = useCallback(() => {
    setSelectedProduct(null);
    syncQuery("product", null);
  }, []);

  return (
    <section className="pb-20 pt-8 sm:pt-10">
      <div className="container-shell">
        <div className="content-shell min-w-0">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CategoryFilter
              activeCategory={activeCategory}
              categories={filterItems}
              label={t("grid.title")}
              onSelect={selectCategory}
            />
            <p className="shrink-0 text-sm text-text-soft" aria-live="polite">
              {t("grid.resultCount", { count: filteredProducts.length })}
            </p>
          </div>

          {filteredProducts.length > 0 ? (
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <li key={product.id} className="min-w-0">
                  <ProductCard
                    categoryName={categoryBySlug.get(product.categorySlug)?.name ?? product.categoryName}
                    onOpen={() => openProduct(product)}
                    product={product}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-8 border-y border-[var(--border)] py-14 text-center">
              {activeCategoryName ? <p className="text-sm text-gold-soft">{activeCategoryName}</p> : null}
              <h2 className="card-title mx-auto mt-2 max-w-xl text-3xl text-foreground">{t("grid.emptyTitle")}</h2>
              <p className="section-copy mx-auto mt-3 max-w-lg">{t("grid.emptyText")}</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/contact" className="gold-button">
                  {t("hero.primaryCta")}
                </Link>
                <a href={companyInfo.whatsappHref} target="_blank" rel="noreferrer" className="ghost-button">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
              {activeCategory !== "all" ? (
                <button type="button" onClick={() => selectCategory("all")} className="text-link mt-6">
                  {nav("links.shop")}: {t("grid.all")}
                </button>
              ) : null}
            </div>
          )}

          <ProductGalleryModal
            category={selectedProduct ? categoryBySlug.get(selectedProduct.categorySlug) : undefined}
            onClose={closeProduct}
            product={selectedProduct}
          />
        </div>
      </div>
    </section>
  );
}
