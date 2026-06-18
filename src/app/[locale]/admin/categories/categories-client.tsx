"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  deleteCategoryAction,
  saveCategoryAction,
  toggleCategoryActiveAction,
} from "@/app/[locale]/admin/categories/actions";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminReadonlyField } from "@/components/admin/AdminReadonlyField";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
  scrollCardIntoView,
} from "@/lib/admin/clientForm";
import type { AdminCategoryRecord, LocalizedText } from "@/lib/db/adminCatalog";

type CategoryFormState = {
  accent: string;
  description: LocalizedText;
  id?: string;
  imageUrl: string;
  isActive: boolean;
  name: LocalizedText;
  slug: string;
  sortOrder: number;
  supportsNameCustomization: boolean;
};

type AdminCategoriesClientProps = {
  categories: AdminCategoryRecord[];
  locale: AppLocale;
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

function createEmptyCategoryForm(categories: AdminCategoryRecord[]): CategoryFormState {
  return {
    accent: "",
    description: createEmptyLocalizedText(),
    imageUrl: "",
    isActive: true,
    name: createEmptyLocalizedText(),
    slug: "",
    sortOrder: categories.length + 1,
    supportsNameCustomization: false,
  };
}

function createEditCategoryForm(category: AdminCategoryRecord): CategoryFormState {
  return {
    accent: category.accent,
    description: category.description,
    id: category.id,
    imageUrl: category.imageUrl,
    isActive: category.isActive,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    supportsNameCustomization: category.supportsNameCustomization,
  };
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

function getCategoryUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      deleteConfirm:
        "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u062a\u0635\u0646\u064a\u0641\u061f",
      imageFallback: "\u0628\u062f\u0648\u0646 \u0635\u0648\u0631\u0629",
      openNow: "\u0645\u0641\u062a\u0648\u062d \u0627\u0644\u0622\u0646",
      personalizationBadge: "\u064a\u062f\u0639\u0645 \u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u0627\u0633\u0645",
      personalizationLabel:
        "\u062a\u0641\u0639\u064a\u0644 \u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u0627\u0633\u0645 \u0644\u0647\u0630\u0627 \u0627\u0644\u062a\u0635\u0646\u064a\u0641",
      slugHelper:
        "\u064a\u0645\u0643\u0646 \u062a\u0631\u0643 \u0627\u0644\u062d\u0642\u0644 \u0641\u0627\u0631\u063a\u0627\u064b \u0644\u064a\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0631\u0627\u0628\u0637 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b.",
    };
  }

  if (locale === "de") {
    return {
      deleteConfirm: "Moechten Sie diese Kategorie wirklich entfernen?",
      imageFallback: "Kein Bild",
      openNow: "Geoeffnet",
      personalizationBadge: "Namenspersonalisierung",
      personalizationLabel: "Namenspersonalisierung fuer diese Kategorie aktivieren",
      slugHelper:
        "Lassen Sie das Feld leer, wenn der Slug automatisch erzeugt werden soll.",
    };
  }

  return {
    deleteConfirm: "Do you really want to remove this category?",
    imageFallback: "No image",
    openNow: "Opened",
    personalizationBadge: "Name personalization",
    personalizationLabel: "Enable name personalization for this category",
    slugHelper: "Leave the field empty to generate the slug automatically.",
  };
}

export function AdminCategoriesClient({
  categories,
  locale,
}: AdminCategoriesClientProps) {
  const t = useTranslations("Admin");
  const uiCopy = getCategoryUiCopy(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [formState, setFormState] = useState<CategoryFormState>(() =>
    createEmptyCategoryForm(categories)
  );
  const editorRef = useRef<HTMLDivElement | null>(null);
  const requiredLabel = getRequiredFieldBadge(locale);

  useEffect(() => {
    if (!editorOpen || !editorRef.current) {
      return;
    }

    scrollCardIntoView(editorRef.current);
  }, [editorOpen, editingCategoryId]);

  const filtered = useMemo(
    () =>
      categories.filter((category) => {
        if (!search.trim()) {
          return true;
        }

        const normalizedSearch = search.toLowerCase();

        return (
          category.displayName.toLowerCase().includes(normalizedSearch) ||
          category.slug.toLowerCase().includes(normalizedSearch)
        );
      }),
    [categories, search]
  );

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const nextState = { ...current };
      delete nextState[field];
      return nextState;
    });
  };

  const resetForm = () => {
    setFieldErrors({});
    setFormState(createEmptyCategoryForm(categories));
    setEditingCategoryId(null);
    setEditorOpen(false);
  };

  const openCreateForm = () => {
    setFeedback(null);
    setFieldErrors({});
    setEditingCategoryId("new");
    setFormState(createEmptyCategoryForm(categories));
    setEditorOpen(true);
  };

  const openEditForm = (category: AdminCategoryRecord) => {
    setFeedback(null);
    setFieldErrors({});
    setEditingCategoryId(category.id);
    setFormState(createEditCategoryForm(category));
    setEditorOpen(true);
  };

  const submitForm = () => {
    const payload = {
      accent: formState.accent,
      description: formState.description,
      imageUrl: formState.imageUrl,
      isActive: formState.isActive,
      name: formState.name,
      slug: formState.slug.trim(),
      sortOrder: Number(formState.sortOrder),
      supportsNameCustomization: formState.supportsNameCustomization,
    };

    startTransition(async () => {
      const result = formState.id
        ? await saveCategoryAction(locale, { ...payload, id: formState.id })
        : await saveCategoryAction(locale, payload);

      setFieldErrors(result.fieldErrors ?? {});
      setFeedback(result.message);

      if (!result.ok) {
        focusFirstInvalidField(result.fieldErrors ?? {});
        return;
      }

      resetForm();
      router.refresh();
    });
  };

  const toggleSelected = (categoryId: string) => {
    setSelected((current) =>
      current.includes(categoryId)
        ? current.filter((value) => value !== categoryId)
        : [...current, categoryId]
    );
  };

  const updateSelection = (isActive: boolean) => {
    startTransition(async () => {
      for (const categoryId of selected) {
        const result = await toggleCategoryActiveAction(locale, categoryId, isActive);

        if (!result.ok) {
          setFeedback(result.message);
          return;
        }
      }

      setSelected([]);
      setFeedback(t("common.mockSubmit"));
      router.refresh();
    });
  };

  const columns: AdminTableColumn<AdminCategoryRecord>[] = [
    {
      id: "select",
      header: t("common.selected"),
      cell: (category) => (
        <input
          type="checkbox"
          checked={selected.includes(category.id)}
          onChange={() => toggleSelected(category.id)}
          className="h-4 w-4 accent-[#c49a52]"
        />
      ),
    },
    {
      id: "category",
      header: t("categories.table.category"),
      cell: (category) => (
        <div className="flex items-center gap-3">
          <div className="relative h-[56px] w-[56px] overflow-hidden rounded-[0.9rem] border border-white/10 bg-white/4">
            {category.imageUrl ? (
              <Image
                src={category.imageUrl}
                alt={category.displayName}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[0.7rem] text-muted">
                {uiCopy.imageFallback}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground">{category.displayName}</p>
            <p className="text-xs text-muted">{category.displayDescription}</p>
          </div>
        </div>
      ),
    },
    {
      id: "slug",
      header: t("categories.table.slug"),
      cell: (category) => category.slug,
    },
    {
      id: "products",
      header: t("categories.table.products"),
      cell: (category) => category.productCount,
    },
    {
      id: "status",
      header: t("categories.table.status"),
      cell: (category) => (
        <AdminBadge variant={category.isActive ? "success" : "danger"}>
          {category.isActive ? t("common.active") : t("common.inactive")}
        </AdminBadge>
      ),
    },
    {
      id: "personalization",
      header: t("common.required"),
      cell: (category) => (
        <AdminBadge variant={category.supportsNameCustomization ? "gold" : "neutral"}>
          {category.supportsNameCustomization
            ? uiCopy.personalizationBadge
            : t("common.disabled")}
        </AdminBadge>
      ),
    },
    {
      id: "actions",
      header: t("categories.table.actions"),
      align: "end",
      cell: (category) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {editorOpen && editingCategoryId === category.id ? (
            <AdminBadge variant="info">{uiCopy.openNow}</AdminBadge>
          ) : null}
          <AdminButton size="sm" variant="secondary" onClick={() => openEditForm(category)}>
            {t("buttons.edit")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant={category.isActive ? "ghost" : "danger"}
            onClick={() =>
              startTransition(async () => {
                const result = await toggleCategoryActiveAction(
                  locale,
                  category.id,
                  !category.isActive
                );
                setFeedback(result.message);
                if (result.ok) {
                  router.refresh();
                }
              })
            }
          >
            {category.isActive ? t("buttons.deactivate") : t("buttons.activate")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant="danger"
            onClick={() => {
              if (!window.confirm(uiCopy.deleteConfirm)) {
                return;
              }

              startTransition(async () => {
                const result = await deleteCategoryAction(locale, category.id);
                setFeedback(result.message);
                if (result.ok) {
                  if (editingCategoryId === category.id) {
                    resetForm();
                  }
                  router.refresh();
                }
              });
            }}
          >
            {t("buttons.delete")}
          </AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("categories.eyebrow")}
        title={t("categories.title")}
        description={t("categories.description")}
        actions={
          <AdminButton variant="primary" onClick={openCreateForm}>
            {t("buttons.newCategory")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      {editorOpen ? (
        <div ref={editorRef}>
          <AdminCard
            title={formState.id ? t("buttons.edit") : t("buttons.newCategory")}
            description={t("categories.description")}
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
                id="slug"
                name="slug"
                label="Slug"
                value={formState.slug}
                errorText={fieldErrors.slug}
                helperText={!fieldErrors.slug ? uiCopy.slugHelper : undefined}
                onChange={(event) => {
                  clearFieldError("slug");
                  setFormState((current) => ({ ...current, slug: event.target.value }));
                }}
              />
              <AdminInput
                id="accent"
                name="accent"
                label="Accent"
                value={formState.accent}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, accent: event.target.value }))
                }
              />
              <AdminInput
                id="imageUrl"
                name="imageUrl"
                label="Image URL"
                value={formState.imageUrl}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    imageUrl: event.target.value,
                  }))
                }
              />
              <AdminInput
                id="sortOrder"
                name="sortOrder"
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
                  id={`name.${language}`}
                  name={`name.${language}`}
                  label={`Name ${language.toUpperCase()}`}
                  value={formState.name[language]}
                  required={language === "de" || language === "ar"}
                  requiredLabel={language === "de" || language === "ar" ? requiredLabel : undefined}
                  errorText={fieldErrors[`name.${language}`]}
                  onChange={(event) => {
                    clearFieldError(`name.${language}`);
                    setFormState((current) => ({
                      ...current,
                      name: updateLocalizedText(current.name, language, event.target.value),
                    }));
                  }}
                />
              ))}
              {(["de", "ar", "en", "fr", "tr"] as const).map((language) => (
                <AdminTextarea
                  key={`description-${language}`}
                  id={`description.${language}`}
                  name={`description.${language}`}
                  label={`Description ${language.toUpperCase()}`}
                  value={formState.description[language]}
                  errorText={fieldErrors[`description.${language}`]}
                  onChange={(event) => {
                    clearFieldError(`description.${language}`);
                    setFormState((current) => ({
                      ...current,
                      description: updateLocalizedText(
                        current.description,
                        language,
                        event.target.value
                      ),
                    }));
                  }}
                />
              ))}
              <div className="xl:col-span-2">
                <div className="flex flex-wrap gap-5">
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
                      checked={formState.supportsNameCustomization}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          supportsNameCustomization: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[#c49a52]"
                    />
                    {uiCopy.personalizationLabel}
                  </label>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      ) : null}

      <AdminCard title={t("categories.bulkTitle")} description={t("categories.bulkDescription")}>
        <AdminToolbar
          actions={
            <>
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={() => updateSelection(true)}
                disabled={selected.length === 0 || isPending}
              >
                {t("buttons.bulkEnable")}
              </AdminButton>
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={() => updateSelection(false)}
                disabled={selected.length === 0 || isPending}
              >
                {t("buttons.bulkDisable")}
              </AdminButton>
            </>
          }
        >
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t("common.search")}
            placeholder={t("categories.searchPlaceholder")}
            icon={<Search className="h-4 w-4" />}
          />
          <AdminReadonlyField
            label={t("common.selected")}
            value={t("categories.selectedCount", { count: selected.length })}
          />
        </AdminToolbar>
      </AdminCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filtered}
          getRowKey={(category) => category.id}
          cardTitle={(category) => category.displayName}
          emptyState={t("categories.empty")}
        />
      </AdminCard>
    </div>
  );
}
