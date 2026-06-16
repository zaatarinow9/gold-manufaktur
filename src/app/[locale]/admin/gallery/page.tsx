"use client";

import { useState } from "react";
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
import { managedCategories, managedProducts } from "@/data/adminMock";
import { Link } from "@/i18n/navigation";
import {
  getCurrentAdminUser,
  hasAdminRoleAccess,
  scopeProductsForUser,
} from "@/lib/admin/currentUser";

export default function AdminGalleryPage() {
  const t = useTranslations("Admin");
  const currentUser = getCurrentAdminUser();
  const canAccess = hasAdminRoleAccess(currentUser, ["super_admin", "admin"]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const categoryItems = [
    { slug: "all", label: t("common.all") },
    ...managedCategories.map((category) => ({
      slug: category.slug,
      label: category.name,
    })),
  ];

  if (!canAccess) {
    return (
      <AdminCard title={t("common.noAccessTitle")} description={t("common.noAccessText")} />
    );
  }

  const products = scopeProductsForUser(currentUser, managedProducts).filter((product) => {
    const matchesSearch =
      search.length === 0 ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.shortDescription.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || product.categorySlug === categoryFilter;

    return matchesSearch && matchesCategory;
  });

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
              {managedCategories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
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

      {products.length === 0 ? (
        <AdminEmptyState
          title={t("gallery.emptyTitle")}
          description={t("gallery.emptyDescription")}
        />
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,15,11,0.92),rgba(8,8,8,0.98))] transition hover:-translate-y-1 hover:border-gold/30"
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

                <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
                  <AdminBadge variant="gold" className="!rounded-full !px-3 !py-2 !text-[0.72rem]">
                    {product.categoryName}
                  </AdminBadge>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                    {product.name}
                  </h2>
                  <p className="text-sm leading-6 text-muted">
                    {product.shortDescription}
                  </p>
                </div>

                <Link
                  href={`/admin/gallery/new-order?product=${product.id}`}
                  className={getAdminButtonClassName({ block: true, variant: "primary" })}
                >
                  {t("gallery.createWorkshopOrder")}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
