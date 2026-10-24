"use client";

import clsx from "clsx";
import { ChevronDown, Eye, EyeOff, ImageOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import {
  deleteCategoryAction,
  saveCategoryAction,
  toggleCategoryActiveAction,
} from "@/app/[locale]/admin/categories/actions";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminDrawer, AdminFormSection } from "@/components/admin/AdminDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSwitch } from "@/components/admin/AdminSwitch";
import { AdminTranslationFields } from "@/components/admin/AdminTranslationFields";
import type { AppLocale } from "@/i18n/routing";
import { nextEditorKey } from "@/lib/admin/editorKey";
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

function createCategoryForm(
  category: AdminCategoryRecord | null,
  nextSortOrder: number
): CategoryFormState {
  if (!category) {
    return {
      accent: "",
      description: { ar: "", de: "", en: "", fr: "", tr: "" },
      imageUrl: "",
      isActive: true,
      name: { ar: "", de: "", en: "", fr: "", tr: "" },
      slug: "",
      sortOrder: nextSortOrder,
      supportsNameCustomization: false,
    };
  }

  return {
    accent: category.accent,
    description: { ...category.description },
    id: category.id,
    imageUrl: category.imageUrl,
    isActive: category.isActive,
    name: { ...category.name },
    slug: category.slug,
    sortOrder: category.sortOrder,
    supportsNameCustomization: category.supportsNameCustomization,
  };
}

function CategoryEditor({
  initialState,
  locale,
  onClose,
  onSaved,
}: {
  initialState: CategoryFormState;
  locale: AppLocale;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const t = useTranslations("Admin.categoriesPage");
  const tc = useTranslations("Admin");
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isNew = !form.id;
  const advancedOpen = showAdvanced || Boolean(errors.slug || errors.sortOrder);

  const submit = () => {
    setFormMessage(null);
    startSaving(async () => {
      const payload = {
        accent: form.accent,
        description: form.description,
        imageUrl: form.imageUrl,
        isActive: form.isActive,
        name: form.name,
        slug: form.slug.trim(),
        sortOrder: Math.max(0, Math.round(form.sortOrder || 0)),
        supportsNameCustomization: form.supportsNameCustomization,
      };
      const result = await saveCategoryAction(
        locale,
        form.id ? { ...payload, id: form.id } : payload
      );

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormMessage(result.message);
        const firstKey = Object.keys(result.fieldErrors ?? {})[0];
        if (firstKey) window.setTimeout(() => document.getElementById(firstKey)?.focus(), 50);
        return;
      }

      onSaved(result.message);
    });
  };

  return (
    <AdminDrawer
      open
      onClose={onClose}
      title={isNew ? t("titleNew") : t("titleEdit")}
      description={isNew ? t("descriptionNew") : form.name[locale] || form.name.de}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {formMessage ? (
            <p role="alert" className="text-sm text-rose-300">{formMessage}</p>
          ) : (
            <span className="text-xs text-muted">{tc("productEditor.requiredHint")}</span>
          )}
          <div className="ms-auto flex gap-2">
            <AdminButton variant="ghost" onClick={onClose}>
              {tc("buttons.cancel")}
            </AdminButton>
            <AdminButton variant="primary" onClick={submit} disabled={isSaving || isUploading}>
              {isSaving ? tc("productEditor.saving") : isNew ? t("create") : tc("productEditor.save")}
            </AdminButton>
          </div>
        </div>
      }
    >
      <AdminFormSection title={t("imageTitle")} hint={t("imageHint")}>
        <AdminImageUploader
          folder="categories"
          images={form.imageUrl ? [form.imageUrl] : []}
          onChange={(images) => setForm((current) => ({ ...current, imageUrl: images[0] ?? "" }))}
          onUploadingChange={setIsUploading}
        />
      </AdminFormSection>

      <AdminFormSection title={t("textTitle")} hint={tc("productEditor.textHint")}>
        <AdminTranslationFields
          errors={errors}
          fields={[
            { key: "name", label: t("nameLabel"), required: true, value: form.name },
            { key: "description", label: t("descriptionLabel"), multiline: true, value: form.description },
          ]}
          onChange={(fieldKey, fieldLocale, value) => {
            const key = fieldKey as "name" | "description";
            setForm((current) => ({ ...current, [key]: { ...current[key], [fieldLocale]: value } }));
            setErrors((current) => {
              const errorKey = `${fieldKey}.${fieldLocale}`;
              if (!current[errorKey]) return current;
              const next = { ...current };
              delete next[errorKey];
              return next;
            });
          }}
        />
      </AdminFormSection>

      <AdminFormSection title={t("settingsTitle")}>
        <div className="space-y-3">
          <AdminSwitch
            checked={form.isActive}
            onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
            label={t("visibleLabel")}
            description={t("visibleHint")}
          />
          <AdminSwitch
            checked={form.supportsNameCustomization}
            onChange={(checked) =>
              setForm((current) => ({ ...current, supportsNameCustomization: checked }))
            }
            label={t("nameCustomizationLabel")}
            description={t("nameCustomizationHint")}
          />
        </div>
      </AdminFormSection>

      <section className="admin-form-section">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-start"
          aria-expanded={advancedOpen}
          onClick={() => setShowAdvanced((current) => !current)}
        >
          <span>
            <span className="admin-form-section-title block">{tc("productEditor.advancedTitle")}</span>
            <span className="admin-form-section-hint block">{t("advancedHint")}</span>
          </span>
          <ChevronDown className={clsx("h-4 w-4 shrink-0 text-muted transition", advancedOpen && "rotate-180")} />
        </button>
        {advancedOpen ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminInput
              id="slug"
              dir="ltr"
              label={tc("productEditor.slugLabel")}
              helperText={tc("productEditor.slugHelper")}
              value={form.slug}
              errorText={errors.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            />
            <AdminInput
              id="sortOrder"
              type="number"
              min={0}
              label={tc("productEditor.sortOrderLabel")}
              helperText={tc("productEditor.sortOrderHelper")}
              value={String(form.sortOrder)}
              errorText={errors.sortOrder}
              onChange={(event) =>
                setForm((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))
              }
            />
          </div>
        ) : null}
      </section>
    </AdminDrawer>
  );
}

export function AdminCategoriesClient({ categories, locale }: AdminCategoriesClientProps) {
  const t = useTranslations("Admin.categoriesPage");
  const tc = useTranslations("Admin");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [editing, setEditing] = useState<{ key: string; category: AdminCategoryRecord | null } | null>(null);

  const sorted = useMemo(
    () => [...categories].sort((left, right) => left.sortOrder - right.sortOrder),
    [categories]
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter((category) =>
      [category.displayName, category.slug, ...Object.values(category.name)]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search, sorted]);

  const runAction = (task: () => Promise<{ message: string; ok: boolean }>) => {
    startTransition(async () => {
      const result = await task();
      setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) router.refresh();
    });
  };

  const openEditor = (category: AdminCategoryRecord | null) => {
    setFeedback(null);
    setEditing({ key: category?.id ?? nextEditorKey(), category });
  };

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

      <label className="relative block max-w-sm">
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

      {filtered.length === 0 ? (
        <AdminEmptyState
          title={search ? t("emptyFilteredTitle") : t("emptyTitle")}
          description={search ? undefined : t("emptyText")}
          action={
            search ? null : (
              <AdminButton variant="primary" onClick={() => openEditor(null)}>
                <Plus />
                {t("add")}
              </AdminButton>
            )
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((category) => (
            <li
              key={category.id}
              className={clsx(
                "admin-panel flex items-center gap-3 p-3 transition hover:border-gold/25",
                !category.isActive && "opacity-70"
              )}
            >
              <button
                type="button"
                onClick={() => openEditor(category)}
                className="flex min-w-0 flex-1 items-center gap-3 text-start"
              >
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[0.6rem] bg-black/40">
                  {category.imageUrl ? (
                    <Image src={category.imageUrl} alt="" fill sizes="4rem" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-muted">
                      <ImageOff className="h-5 w-5" />
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">
                    {category.displayName}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {t("productCount", { count: category.productCount })}
                    {!category.isActive ? ` · ${tc("productsPage.hiddenBadge")}` : ""}
                  </span>
                  {category.supportsNameCustomization ? (
                    <span className="mt-1 inline-block text-xs text-gold-soft">
                      {t("nameCustomizationBadge")}
                    </span>
                  ) : null}
                </span>
              </button>
              <AdminActionMenu
                label={tc("productsPage.moreActions", { name: category.displayName })}
                items={[
                  { icon: Pencil, label: tc("buttons.edit"), onSelect: () => openEditor(category) },
                  {
                    icon: category.isActive ? EyeOff : Eye,
                    label: category.isActive ? tc("productsPage.hide") : tc("productsPage.show"),
                    onSelect: () =>
                      runAction(() =>
                        toggleCategoryActiveAction(locale, category.id, !category.isActive)
                      ),
                  },
                  {
                    danger: true,
                    icon: Trash2,
                    label: tc("buttons.delete"),
                    onSelect: () => {
                      const message =
                        category.productCount > 0
                          ? t("deleteConfirmWithProducts", {
                              count: category.productCount,
                              name: category.displayName,
                            })
                          : t("deleteConfirm", { name: category.displayName });
                      if (window.confirm(message)) {
                        runAction(() => deleteCategoryAction(locale, category.id));
                      }
                    },
                  },
                ]}
              />
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <CategoryEditor
          key={editing.key}
          locale={locale}
          initialState={createCategoryForm(editing.category, categories.length + 1)}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setFeedback({ message, tone: "success" });
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
