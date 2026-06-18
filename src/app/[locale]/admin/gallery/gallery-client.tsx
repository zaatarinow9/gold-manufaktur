"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type {
  AdminCategoryRecord,
  AdminProductRecord,
} from "@/lib/db/adminCatalog";

type AdminGalleryClientProps = {
  categories: AdminCategoryRecord[];
  locale: AppLocale;
  products: AdminProductRecord[];
};

function getGalleryEmptyCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      description: "لا توجد منتجات في المعرض حالياً.",
      title: "المعرض فارغ حالياً",
    };
  }

  if (locale === "de") {
    return {
      description: "Derzeit sind keine Produkte in der Galerie vorhanden.",
      title: "Keine Produkte in der Galerie",
    };
  }

  return {
    description: "There are currently no products in the gallery.",
    title: "No gallery products available",
  };
}

export function AdminGalleryClient({
  categories,
  locale,
  products,
}: AdminGalleryClientProps) {
  const t = useTranslations("Admin");
  const emptyCopy = getGalleryEmptyCopy(locale);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");

  const categoryItems = useMemo(
    () => [
      { slug: "all", label: t("common.all") },
      ...categories.map((category) => ({
        slug: category.slug,
        label: category.displayName,
      })),
    ],
    [categories, t]
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        query.length === 0 ||
        product.displayName.toLowerCase().includes(query) ||
        product.displayDescription.toLowerCase().includes(query) ||
        product.categoryName.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);
      const matchesCategory =
        categoryFilter === "all" || product.categorySlug === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? product.isActive : !product.isActive);
      const matchesFeatured =
        featuredFilter === "all" ||
        (featuredFilter === "featured" ? product.isFeatured : !product.isFeatured);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesFeatured
      );
    });
  }, [categoryFilter, featuredFilter, products, search, statusFilter]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("gallery.eyebrow")}
        title={t("gallery.title")}
        description={t("gallery.description")}
        actions={
          <Link
            href="/admin/gallery/new-order"
            className={getAdminButtonClassName({ variant: "primary" })}
          >
            {t("buttons.createOrder")}
          </Link>
        }
      />

      <AdminCard title={t("gallery.filtersTitle")} description={t("gallery.filtersDescription")}>
        <div className="space-y-5">
          <AdminToolbar>
            <AdminInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              label={t("common.search")}
              placeholder={t("gallery.searchPlaceholder")}
              icon={<Search className="h-4 w-4" />}
            />
            <AdminSelect
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              label={t("filters.category")}
            >
              <option value="all">{t("common.all")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.displayName}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              label={t("filters.status")}
            >
              <option value="all">{t("common.all")}</option>
              <option value="active">{t("common.active")}</option>
              <option value="inactive">{t("common.inactive")}</option>
            </AdminSelect>
            <AdminSelect
              value={featuredFilter}
              onChange={(event) => setFeaturedFilter(event.target.value)}
              label={t("filters.featured")}
            >
              <option value="all">{t("common.all")}</option>
              <option value="featured">{t("products.featuredOnly")}</option>
              <option value="regular">{t("products.regularOnly")}</option>
            </AdminSelect>
          </AdminToolbar>

          <div className="flex flex-wrap gap-3 overflow-x-auto pb-1 md:overflow-visible">
            {categoryItems.map((category) => {
              const isActive = category.slug === categoryFilter;

              return (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => setCategoryFilter(category.slug)}
                  className={`inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "border-gold/30 bg-gold text-[#140d07] shadow-[0_16px_35px_rgba(196,154,82,0.18)]"
                      : "border-white/10 bg-white/4 text-muted hover:border-gold/25 hover:bg-white/6 hover:text-foreground"
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </AdminCard>

      {visibleProducts.length === 0 ? (
        <AdminEmptyState
          title={emptyCopy.title}
          description={emptyCopy.description}
        />
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,15,11,0.92),rgba(8,8,8,0.98))] transition hover:-translate-y-1 hover:border-gold/30"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={product.imageUrl}
                  alt={product.displayName}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  sizes="(max-width: 767px) 100vw, (max-width: 1535px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.86))]" />

                <div className="absolute inset-x-4 top-4 flex flex-wrap items-start justify-between gap-3">
                  <AdminBadge variant="gold" className="!rounded-full !px-3 !py-2 !text-[0.72rem]">
                    {product.categoryName || t("common.notProvided")}
                  </AdminBadge>
                  <div className="flex flex-wrap justify-end gap-2">
                    {!product.isActive ? (
                      <AdminBadge variant="danger" className="!rounded-full !px-3 !py-2 !text-[0.72rem]">
                        {t("common.inactive")}
                      </AdminBadge>
                    ) : null}
                    {product.isFeatured ? (
                      <AdminBadge variant="info" className="!rounded-full !px-3 !py-2 !text-[0.72rem]">
                        {t("filters.featured")}
                      </AdminBadge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                    {product.displayName}
                  </h2>
                  <p className="text-sm leading-6 text-muted">
                    {product.displayDescription}
                  </p>
                </div>

                {product.isActive ? (
                  <Link
                    href={`/admin/gallery/new-order?product=${product.id}`}
                    className={getAdminButtonClassName({ block: true, variant: "primary" })}
                  >
                    {t("gallery.createWorkshopOrder")}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm text-muted">
                    {t("common.inactive")}
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
