"use client";

import clsx from "clsx";
import { ArrowRight, ImageOff, Search } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { AdminCategoryRecord, AdminProductRecord } from "@/lib/db/adminCatalog";

type AdminGalleryClientProps = {
  categories: AdminCategoryRecord[];
  locale: AppLocale;
  products: AdminProductRecord[];
};

/** Step 1 of a new order: pick the product. */
export function AdminGalleryClient({ categories, products }: AdminGalleryClientProps) {
  const t = useTranslations("Admin.galleryPage");
  const tc = useTranslations("Admin");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const orderableProducts = useMemo(() => products.filter((product) => product.isActive), [products]);
  const categoriesWithProducts = useMemo(
    () => categories.filter((category) => orderableProducts.some((product) => product.categoryId === category.id)),
    [categories, orderableProducts]
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orderableProducts.filter((product) => {
      const matchesSearch =
        !query ||
        [product.displayName, product.categoryName, product.sku].join(" ").toLowerCase().includes(query);
      const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, orderableProducts, search]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("pickTitle")} description={t("pickDescription")} />

      <div className="space-y-3">
        <label className="relative block max-w-md">
          <span className="sr-only">{tc("common.search")}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="admin-input admin-input-with-icon"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {categoriesWithProducts.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label={tc("filters.category")}>
            <button
              type="button"
              className="admin-chip"
              aria-pressed={categoryFilter === "all"}
              onClick={() => setCategoryFilter("all")}
            >
              {t("allCategories")}
            </button>
            {categoriesWithProducts.map((category) => (
              <button
                key={category.id}
                type="button"
                className="admin-chip"
                aria-pressed={categoryFilter === category.id}
                onClick={() => setCategoryFilter(category.id)}
              >
                {category.displayName}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {visibleProducts.length === 0 ? (
        <AdminEmptyState
          title={orderableProducts.length === 0 ? t("title") : t("noMatchTitle")}
          description={orderableProducts.length === 0 ? t("description") : undefined}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <li key={product.id}>
              <Link
                href={`/admin/gallery/new-order?product=${product.id}`}
                className="admin-panel group flex h-full flex-col overflow-hidden transition hover:border-gold/30"
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-black/40">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-muted">
                      <ImageOff className="h-6 w-6" />
                    </span>
                  )}
                </span>
                <span className="flex flex-1 items-center gap-3 p-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">{product.displayName}</span>
                    <span className="block truncate text-sm text-muted">
                      {product.categoryName || tc("productsPage.withoutCategory")}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold-soft transition",
                      "group-hover:bg-gold group-hover:text-[#1a1209]"
                    )}
                    aria-hidden="true"
                  >
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </span>
                  <span className="sr-only">{t("startOrder", { name: product.displayName })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
