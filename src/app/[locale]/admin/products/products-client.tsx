"use client";

import clsx from "clsx";
import {
  Copy,
  Eye,
  EyeOff,
  ImageOff,
  Pencil,
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import {
  deleteProductAction,
  duplicateProductAction,
  toggleProductActiveAction,
  toggleProductFeaturedAction,
} from "@/app/[locale]/admin/products/actions";
import { useAdminConfirm } from "@/components/admin/AdminConfirm";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTabs } from "@/components/admin/AdminTabs";
import type { AppLocale } from "@/i18n/routing";
import { nextEditorKey } from "@/lib/admin/editorKey";
import type {
  AdminCategoryRecord,
  AdminOptionGroupRecord,
  AdminProductRecord,
} from "@/lib/db/adminCatalog";

import { createProductForm, ProductEditor } from "./product-editor";

type AdminProductsClientProps = {
  categories: AdminCategoryRecord[];
  groups: AdminOptionGroupRecord[];
  locale: AppLocale;
  products: AdminProductRecord[];
};

type StatusFilter = "all" | "visible" | "hidden" | "featured";

export function AdminProductsClient({
  categories,
  groups,
  locale,
  products,
}: AdminProductsClientProps) {
  const t = useTranslations("Admin.productsPage");
  const tc = useTranslations("Admin");
  const confirm = useAdminConfirm();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const searchParams = useSearchParams();
  // "?new=1" (from the overview's quick action) opens the form right away.
  const [editing, setEditing] = useState<{ categoryId?: string; key: string; product: AdminProductRecord | null } | null>(
    () => (searchParams.get("new") === "1" ? { key: "new", product: null } : null)
  );

  const counts = useMemo(
    () => ({
      all: products.length,
      featured: products.filter((product) => product.isFeatured).length,
      hidden: products.filter((product) => !product.isActive).length,
      visible: products.filter((product) => product.isActive).length,
    }),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !query ||
        [product.displayName, product.sku, product.categoryName, ...Object.values(product.name)]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        status === "all" ||
        (status === "visible" && product.isActive) ||
        (status === "hidden" && !product.isActive) ||
        (status === "featured" && product.isFeatured);
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "none" ? !product.categoryId : product.categoryId === categoryFilter);

      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, products, search, status]);

  const runAction = (task: () => Promise<{ message: string; ok: boolean }>) => {
    startTransition(async () => {
      const result = await task();
      setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) router.refresh();
    });
  };

  const openEditor = (product: AdminProductRecord | null) => {
    setFeedback(null);
    setEditing({ key: product?.id ?? nextEditorKey(), product });
  };

  const isFiltered = search.trim().length > 0 || status !== "all" || categoryFilter !== "all";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <AdminButton variant="primary" onClick={() => openEditor(null)}>
            <Plus />
            {t("add")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.tone} role="status">
          {feedback.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block lg:w-80">
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
        <label className="block lg:w-60">
          <span className="sr-only">{t("categoryFilter")}</span>
          <select
            className="admin-select"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">{t("allCategories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.displayName}
              </option>
            ))}
            <option value="none">{t("withoutCategory")}</option>
          </select>
        </label>
        <AdminTabs
          className="lg:ms-auto"
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
          tabs={[
            { id: "all", label: t("filters.all"), count: counts.all },
            { id: "visible", label: t("filters.visible"), count: counts.visible },
            { id: "hidden", label: t("filters.hidden"), count: counts.hidden },
            { id: "featured", label: t("filters.featured"), count: counts.featured },
          ]}
        />
      </div>

      {filteredProducts.length === 0 ? (
        <AdminEmptyState
          title={isFiltered ? t("emptyFilteredTitle") : t("emptyTitle")}
          description={isFiltered ? t("emptyFilteredText") : t("emptyText")}
          action={
            isFiltered ? (
              <AdminButton
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                  setCategoryFilter("all");
                }}
              >
                {t("clearFilters")}
              </AdminButton>
            ) : (
              <AdminButton variant="primary" onClick={() => openEditor(null)}>
                <Plus />
                {t("add")}
              </AdminButton>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <li
              key={product.id}
              className={clsx(
                "admin-panel group flex flex-col overflow-hidden transition hover:border-gold/25",
                !product.isActive && "opacity-70"
              )}
            >
              <button
                type="button"
                className="relative block aspect-[4/3] w-full overflow-hidden bg-black/40 text-start"
                onClick={() => openEditor(product)}
                aria-label={t("editProduct", { name: product.displayName })}
              >
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted">
                    <ImageOff className="h-6 w-6" />
                    {t("noPhoto")}
                  </span>
                )}
                <span className="absolute start-2.5 top-2.5 flex flex-wrap gap-1.5">
                  {!product.isActive ? (
                    <span className="rounded-full bg-black/75 px-2 py-0.5 text-xs font-medium text-muted">
                      {t("hiddenBadge")}
                    </span>
                  ) : null}
                  {product.isFeatured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-xs font-medium text-gold-soft">
                      <Star className="h-3 w-3 fill-current" />
                      {t("featuredBadge")}
                    </span>
                  ) : null}
                </span>
              </button>

              <div className="flex flex-1 items-start gap-2 p-3.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => openEditor(product)}
                >
                  <p className="truncate font-semibold text-foreground">{product.displayName}</p>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {product.categoryName || t("withoutCategory")}
                  </p>
                  <p className="mt-1 text-xs text-text-soft">
                    <bdi>{product.sku}</bdi>
                  </p>
                </button>
                <AdminActionMenu
                  label={t("moreActions", { name: product.displayName })}
                  items={[
                    { icon: Pencil, label: tc("buttons.edit"), onSelect: () => openEditor(product) },
                    {
                      icon: product.isActive ? EyeOff : Eye,
                      label: product.isActive ? t("hide") : t("show"),
                      onSelect: () =>
                        runAction(() => toggleProductActiveAction(locale, product.id, !product.isActive)),
                    },
                    {
                      icon: product.isFeatured ? StarOff : Star,
                      label: product.isFeatured ? t("unfeature") : t("feature"),
                      onSelect: () =>
                        runAction(() =>
                          toggleProductFeaturedAction(locale, product.id, !product.isFeatured)
                        ),
                    },
                    {
                      icon: Copy,
                      label: tc("buttons.duplicate"),
                      onSelect: () => runAction(() => duplicateProductAction(locale, product.id)),
                    },
                    {
                      danger: true,
                      icon: Trash2,
                      label: tc("buttons.delete"),
                      onSelect: async () => {
                        if (await confirm({ title: t("deleteConfirm", { name: product.displayName }) })) {
                          runAction(() => deleteProductAction(locale, product.id));
                        }
                      },
                    },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <ProductEditor
          key={editing.key}
          locale={locale}
          categories={categories}
          groups={groups}
          initialState={createProductForm(editing.product, {
            categoryId:
              editing.categoryId ?? (categoryFilter !== "all" && categoryFilter !== "none" ? categoryFilter : ""),
            nextSortOrder: products.length + 1,
          })}
          onClose={() => setEditing(null)}
          onDelete={
            editing.product
              ? async () => {
                  const product = editing.product!;
                  const confirmed = await confirm({ title: t("deleteConfirm", { name: product.displayName }) });
                  if (!confirmed) return false;
                  const result = await deleteProductAction(locale, product.id);
                  setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
                  if (result.ok) router.refresh();
                  return result.ok;
                }
              : undefined
          }
          onSaved={(message, options) => {
            setFeedback({ message, tone: "success" });
            router.refresh();
            setEditing(
              options?.addAnother ? { categoryId: options.categoryId, key: nextEditorKey(), product: null } : null
            );
          }}
        />
      ) : null}
    </div>
  );
}
