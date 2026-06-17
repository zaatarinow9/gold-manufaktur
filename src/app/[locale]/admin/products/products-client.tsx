"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  duplicateProductAction,
  saveProductAction,
  toggleProductActiveAction,
  toggleProductFeaturedAction,
} from "@/app/[locale]/admin/products/actions";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import type {
  AdminCategoryRecord,
  AdminOptionRecord,
  AdminProductRecord,
  LocalizedText,
} from "@/lib/db/adminCatalog";

type ProductOptionSettingState = {
  isRequired: boolean;
  optionId: string;
};

type ProductFormState = {
  categoryId: string;
  description: LocalizedText;
  galleryText: string;
  id?: string;
  isActive: boolean;
  isFeatured: boolean;
  name: LocalizedText;
  optionSettings: ProductOptionSettingState[];
  sku: string;
  slug: string;
  sortOrder: number;
  tagsText: string;
};

type AdminProductsClientProps = {
  categories: AdminCategoryRecord[];
  locale: AppLocale;
  options: AdminOptionRecord[];
  products: AdminProductRecord[];
};

function createEmptyLocalizedText(): LocalizedText {
  return {
    ar: "",
    de: "",
    en: "",
    fr: "",
    tr: "",
  };
}

function createEmptyProductForm(
  categories: AdminCategoryRecord[],
  products: AdminProductRecord[]
): ProductFormState {
  return {
    categoryId: categories[0]?.id ?? "",
    description: createEmptyLocalizedText(),
    galleryText: "",
    isActive: true,
    isFeatured: false,
    name: createEmptyLocalizedText(),
    optionSettings: [],
    sku: `GH-${String(products.length + 1).padStart(4, "0")}`,
    slug: "",
    sortOrder: products.length + 1,
    tagsText: "",
  };
}

function createEditProductForm(product: AdminProductRecord): ProductFormState {
  return {
    categoryId: product.categoryId ?? "",
    description: product.description,
    galleryText: product.gallery.join("\n"),
    id: product.id,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    name: product.name,
    optionSettings: product.optionSettings.map((option) => ({
      isRequired: option.isRequired,
      optionId: option.id,
    })),
    sku: product.sku,
    slug: product.slug,
    sortOrder: product.sortOrder,
    tagsText: product.tags.join(", "),
  };
}

function splitTextareaLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function updateLocalizedText(
  current: LocalizedText,
  locale: keyof LocalizedText,
  value: string
) {
  return {
    ...current,
    [locale]: value,
  };
}

function getProductOptionSetting(
  optionSettings: ProductOptionSettingState[],
  optionId: string
) {
  return optionSettings.find((setting) => setting.optionId === optionId);
}

function setProductOptionVisibility(
  optionSettings: ProductOptionSettingState[],
  optionId: string,
  visible: boolean,
  isRequired: boolean
) {
  if (!visible) {
    return optionSettings.filter((setting) => setting.optionId !== optionId);
  }

  const nextSetting = { isRequired, optionId };
  const existing = getProductOptionSetting(optionSettings, optionId);

  if (!existing) {
    return [...optionSettings, nextSetting];
  }

  return optionSettings.map((setting) =>
    setting.optionId === optionId ? nextSetting : setting
  );
}

export function AdminProductsClient({
  categories,
  locale,
  options,
  products,
}: AdminProductsClientProps) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [formState, setFormState] = useState<ProductFormState>(() =>
    createEmptyProductForm(categories, products)
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch =
          search.length === 0 ||
          product.displayName.toLowerCase().includes(search.toLowerCase()) ||
          product.sku.toLowerCase().includes(search.toLowerCase()) ||
          product.slug.toLowerCase().includes(search.toLowerCase());
        const matchesTab =
          tab === "all" ||
          (tab === "active" && product.isActive) ||
          (tab === "inactive" && !product.isActive) ||
          (tab === "featured" && product.isFeatured);
        const matchesCategory =
          categoryFilter === "all" || product.categoryId === categoryFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" ? product.isActive : !product.isActive);
        const matchesFeatured =
          featuredFilter === "all" ||
          (featuredFilter === "featured" ? product.isFeatured : !product.isFeatured);

        return (
          matchesSearch &&
          matchesTab &&
          matchesCategory &&
          matchesStatus &&
          matchesFeatured
        );
      }),
    [
      categoryFilter,
      featuredFilter,
      products,
      search,
      statusFilter,
      tab,
    ]
  );

  const resetForm = () => {
    setFormState(createEmptyProductForm(categories, products));
    setEditorOpen(false);
  };

  const submitForm = () => {
    const payload = {
      categoryId: formState.categoryId || null,
      description: formState.description,
      gallery: splitTextareaLines(formState.galleryText),
      isActive: formState.isActive,
      isFeatured: formState.isFeatured,
      name: formState.name,
      optionSettings: formState.optionSettings,
      sku: formState.sku.trim(),
      slug: formState.slug.trim(),
      sortOrder: Number(formState.sortOrder),
      tags: splitCommaList(formState.tagsText),
    };

    startTransition(async () => {
      const result = formState.id
        ? await saveProductAction(locale, { ...payload, id: formState.id })
        : await saveProductAction(locale, payload);

      setFeedback(result.message);

      if (result.ok) {
        resetForm();
        router.refresh();
      }
    });
  };

  const openCreateForm = () => {
    setFeedback(null);
    setFormState(createEmptyProductForm(categories, products));
    setEditorOpen(true);
  };

  const columns: AdminTableColumn<AdminProductRecord>[] = [
    {
      id: "product",
      header: t("products.table.product"),
      cell: (product) => (
        <div className="flex items-center gap-3">
          <div className="relative h-[72px] w-[72px] overflow-hidden rounded-[0.9rem] border border-white/10">
            <Image
              src={product.imageUrl}
              alt={product.displayName}
              fill
              className="object-cover"
              sizes="72px"
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{product.displayName}</p>
            <p className="truncate text-xs text-muted">{product.sku}</p>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: t("products.table.category"),
      cell: (product) => product.categoryName,
    },
    {
      id: "status",
      header: t("products.table.status"),
      cell: (product) => (
        <div className="flex flex-wrap gap-2">
          <AdminBadge variant={product.isActive ? "success" : "danger"}>
            {product.isActive ? t("common.active") : t("common.inactive")}
          </AdminBadge>
          {product.isFeatured ? (
            <AdminBadge variant="gold">{t("products.featuredOnly")}</AdminBadge>
          ) : null}
        </div>
      ),
    },
    {
      id: "options",
      header: t("products.table.options"),
      cell: (product) => `${product.optionCount} ${t("products.optionsCount")}`,
    },
    {
      id: "visibility",
      header: t("common.visibility"),
      cell: (product) => (
        <div className="flex flex-wrap gap-2">
          <AdminBadge variant={product.isActive ? "success" : "neutral"}>
            {product.isActive ? t("common.visible") : t("common.hidden")}
          </AdminBadge>
          {product.isFeatured ? (
            <AdminBadge variant="gold">{t("products.featuredOnly")}</AdminBadge>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      align: "end",
      header: t("products.table.actions"),
      cell: (product) => (
        <div className="flex flex-wrap justify-end gap-2">
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() => {
              setFeedback(null);
              setFormState(createEditProductForm(product));
              setEditorOpen(true);
            }}
          >
            {t("buttons.edit")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() =>
              startTransition(async () => {
                const result = await duplicateProductAction(locale, product.id);
                setFeedback(result.message);
                if (result.ok) {
                  router.refresh();
                }
              })
            }
          >
            {t("buttons.duplicate")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant={product.isFeatured ? "primary" : "secondary"}
            onClick={() =>
              startTransition(async () => {
                const result = await toggleProductFeaturedAction(
                  locale,
                  product.id,
                  !product.isFeatured
                );
                setFeedback(result.message);
                if (result.ok) {
                  router.refresh();
                }
              })
            }
          >
            {t("filters.featured")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant={product.isActive ? "ghost" : "danger"}
            onClick={() =>
              startTransition(async () => {
                const result = await toggleProductActiveAction(
                  locale,
                  product.id,
                  !product.isActive
                );
                setFeedback(result.message);
                if (result.ok) {
                  router.refresh();
                }
              })
            }
          >
            {product.isActive ? t("buttons.deactivate") : t("buttons.activate")}
          </AdminButton>
        </div>
      ),
    },
  ];

  const optionGroups = useMemo(() => {
    const groupedOptions = new Map<
      string,
      { groupName: string; options: AdminOptionRecord[] }
    >();

    options
      .slice()
      .sort((left, right) => {
        const groupCompare = left.groupName.localeCompare(right.groupName, locale);

        if (groupCompare !== 0) {
          return groupCompare;
        }

        return left.displayLabel.localeCompare(right.displayLabel, locale);
      })
      .forEach((option) => {
        const currentGroup = groupedOptions.get(option.groupKey);

        if (!currentGroup) {
          groupedOptions.set(option.groupKey, {
            groupName: option.groupName,
            options: [option],
          });
          return;
        }

        currentGroup.options.push(option);
      });

    return Array.from(groupedOptions.entries()).map(([groupKey, group]) => ({
      groupKey,
      groupName: group.groupName,
      options: group.options,
    }));
  }, [locale, options]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("products.eyebrow")}
        title={t("products.title")}
        description={t("products.description")}
        actions={
          <AdminButton variant="primary" onClick={openCreateForm}>
            {t("buttons.addProduct")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      {editorOpen ? (
        <AdminCard
          title={formState.id ? t("buttons.edit") : t("buttons.addProduct")}
          description={t("products.description")}
          action={
            <div className="flex gap-2">
              <AdminButton variant="ghost" onClick={resetForm}>
                {t("buttons.close")}
              </AdminButton>
              <AdminButton variant="primary" onClick={submitForm} disabled={isPending}>
                {t("buttons.save")}
              </AdminButton>
            </div>
          }
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminInput
              label="SKU"
              value={formState.sku}
              onChange={(event) =>
                setFormState((current) => ({ ...current, sku: event.target.value }))
              }
            />
            <AdminInput
              label="Slug"
              value={formState.slug}
              onChange={(event) =>
                setFormState((current) => ({ ...current, slug: event.target.value }))
              }
            />
            <AdminSelect
              label={t("filters.category")}
              value={formState.categoryId}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
            >
              <option value="">{t("common.all")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.displayName}
                </option>
              ))}
            </AdminSelect>
            <AdminInput
              label="Sort Order"
              type="number"
              value={String(formState.sortOrder)}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  sortOrder: Number(event.target.value || 0),
                }))
              }
            />
            {(["de", "ar", "en", "fr", "tr"] as const).map((language) => (
              <AdminInput
                key={`name-${language}`}
                label={`Name ${language.toUpperCase()}`}
                value={formState.name[language]}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: updateLocalizedText(
                      current.name,
                      language,
                      event.target.value
                    ),
                  }))
                }
              />
            ))}
            {(["de", "ar", "en", "fr", "tr"] as const).map((language) => (
              <AdminTextarea
                key={`description-${language}`}
                label={`Description ${language.toUpperCase()}`}
                value={formState.description[language]}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: updateLocalizedText(
                      current.description,
                      language,
                      event.target.value
                    ),
                  }))
                }
              />
            ))}
            <AdminTextarea
              label="Gallery URLs"
              helperText="One image path per line."
              value={formState.galleryText}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  galleryText: event.target.value,
                }))
              }
            />
            <AdminTextarea
              label="Tags"
              helperText="Separate tags with commas."
              value={formState.tagsText}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  tagsText: event.target.value,
                }))
              }
            />
            <div className="space-y-4 xl:col-span-2">
              <div className="space-y-1">
                <p className="admin-label">{t("products.table.options")}</p>
                <p className="text-xs text-muted">
                  Choose which options are visible on this product and which must
                  be filled in when creating an order.
                </p>
              </div>
              {optionGroups.length === 0 ? (
                <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4 text-sm text-muted">
                  No product options have been created yet.
                </div>
              ) : (
                <div className="grid gap-4">
                  {optionGroups.map((group) => (
                    <div
                      key={group.groupKey}
                      className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
                    >
                      <div className="mb-4">
                        <p className="font-semibold text-foreground">{group.groupName}</p>
                        <p className="text-xs text-muted">
                          {group.options.length} option
                          {group.options.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="space-y-3">
                        {group.options.map((option) => {
                          const currentSetting = getProductOptionSetting(
                            formState.optionSettings,
                            option.id
                          );
                          const isVisible = Boolean(currentSetting);
                          const isRequired = currentSetting?.isRequired ?? false;

                          return (
                            <div
                              key={option.id}
                              className="grid gap-3 rounded-[0.9rem] border border-white/8 bg-black/10 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                            >
                              <div>
                                <p className="font-medium text-foreground">
                                  {option.displayLabel}
                                </p>
                                <p className="text-xs text-muted">
                                  {option.type.replace(/_/g, " ")}
                                </p>
                              </div>
                              <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                                <input
                                  type="checkbox"
                                  checked={isVisible}
                                  onChange={(event) =>
                                    setFormState((current) => ({
                                      ...current,
                                      optionSettings: setProductOptionVisibility(
                                        current.optionSettings,
                                        option.id,
                                        event.target.checked,
                                        currentSetting?.isRequired ??
                                          option.isRequired
                                      ),
                                    }))
                                  }
                                  className="h-4 w-4 accent-[#c49a52]"
                                />
                                Visible
                              </label>
                              <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                                <input
                                  type="checkbox"
                                  checked={isRequired}
                                  disabled={!isVisible}
                                  onChange={(event) =>
                                    setFormState((current) => ({
                                      ...current,
                                      optionSettings: setProductOptionVisibility(
                                        current.optionSettings,
                                        option.id,
                                        true,
                                        event.target.checked
                                      ),
                                    }))
                                  }
                                  className="h-4 w-4 accent-[#c49a52]"
                                />
                                Required
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-5 xl:col-span-2">
              <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#c49a52]"
                />
                {t("common.active")}
              </label>
              <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={formState.isFeatured}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      isFeatured: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#c49a52]"
                />
                {t("filters.featured")}
              </label>
            </div>
          </div>
        </AdminCard>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminTabs
          tabs={[
            { id: "all", label: t("common.all"), count: products.length },
            {
              id: "active",
              label: t("common.active"),
              count: products.filter((product) => product.isActive).length,
            },
            {
              id: "inactive",
              label: t("common.inactive"),
              count: products.filter((product) => !product.isActive).length,
            },
            {
              id: "featured",
              label: t("products.featuredOnly"),
              count: products.filter((product) => product.isFeatured).length,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
        <p className="text-sm text-muted">
          {t("products.resultCount", { count: filteredProducts.length })}
        </p>
      </div>

      <AdminCard
        title={t("products.filtersTitle")}
        description={t("products.filtersDescription")}
      >
        <AdminToolbar>
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t("common.search")}
            placeholder={t("products.searchPlaceholder")}
            icon={<Search className="h-4 w-4" />}
          />
          <AdminSelect
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            label={t("filters.category")}
          >
            <option value="all">{t("common.all")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
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
      </AdminCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filteredProducts}
          getRowKey={(product) => product.id}
          cardTitle={(product) => product.displayName}
          emptyState={t("products.empty")}
        />
      </AdminCard>
    </div>
  );
}
