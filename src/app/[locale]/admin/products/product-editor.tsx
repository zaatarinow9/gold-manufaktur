"use client";

import { Check, ChevronDown, Plus, Settings2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { quickCreateCategoryAction, saveProductAction } from "@/app/[locale]/admin/products/actions";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminDrawer, AdminFormSection } from "@/components/admin/AdminDrawer";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminSwitch } from "@/components/admin/AdminSwitch";
import { AdminTranslationFields } from "@/components/admin/AdminTranslationFields";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type {
  AdminCategoryRecord,
  AdminOptionGroupRecord,
  AdminProductRecord,
  LocalizedText,
} from "@/lib/db/adminCatalog";

type ProductFormState = {
  categoryId: string;
  description: LocalizedText;
  gallery: string[];
  id?: string;
  isActive: boolean;
  isFeatured: boolean;
  name: LocalizedText;
  optionGroupId: string;
  sku: string;
  slug: string;
  sortOrder: number;
  tagsText: string;
};

const advancedFields = ["sku", "slug", "sortOrder", "tags"];

function emptyLocalized(): LocalizedText {
  return { ar: "", de: "", en: "", fr: "", tr: "" };
}

export function createProductForm(
  product: AdminProductRecord | null,
  defaults: { categoryId: string; nextSortOrder: number }
): ProductFormState {
  if (!product) {
    return {
      categoryId: defaults.categoryId,
      description: emptyLocalized(),
      gallery: [],
      isActive: true,
      isFeatured: false,
      name: emptyLocalized(),
      optionGroupId: "",
      // Left empty on purpose: the server assigns the next free code.
      sku: "",
      slug: "",
      sortOrder: defaults.nextSortOrder,
      tagsText: "",
    };
  }

  return {
    categoryId: product.categoryId ?? "",
    description: { ...product.description },
    gallery: [...product.gallery],
    id: product.id,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    name: { ...product.name },
    optionGroupId: product.optionGroupId ?? "",
    sku: product.sku,
    slug: product.slug,
    sortOrder: product.sortOrder,
    tagsText: product.tags.join(", "),
  };
}

type ProductEditorProps = {
  categories: AdminCategoryRecord[];
  groups: AdminOptionGroupRecord[];
  initialState: ProductFormState;
  locale: AppLocale;
  onClose: () => void;
  /** Shown for existing products; resolves true when the product was deleted. */
  onDelete?: () => Promise<boolean>;
  onSaved: (message: string, options?: { addAnother?: boolean; categoryId?: string }) => void;
};

export function ProductEditor({
  categories,
  groups,
  initialState,
  locale,
  onClose,
  onDelete,
  onSaved,
}: ProductEditorProps) {
  const t = useTranslations("Admin.productEditor");
  const tc = useTranslations("Admin");
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [extraCategories, setExtraCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, startCreatingCategory] = useTransition();
  const categoryChoices = [
    ...categories.map((category) => ({ hidden: !category.isActive, id: category.id, name: category.displayName })),
    ...extraCategories.map((category) => ({ hidden: false, id: category.id, name: category.name })),
  ];

  const createCategoryInline = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    startCreatingCategory(async () => {
      const result = await quickCreateCategoryAction(locale, name);
      if (!result.ok || !result.category) {
        setErrors((current) => ({ ...current, categoryId: result.message }));
        return;
      }
      setExtraCategories((current) => [...current, result.category!]);
      update("categoryId", result.category.id);
      setNewCategoryName("");
      setNewCategoryOpen(false);
    });
  };
  const isNew = !form.id;
  const selectedGroup = groups.find((group) => group.id === form.optionGroupId) ?? null;
  const advancedHasError = advancedFields.some((field) => errors[field]);
  const uploadFolder = useMemo(
    () => form.slug || form.sku || form.name.de || "catalog",
    [form.name.de, form.sku, form.slug]
  );

  const update = <Key extends keyof ProductFormState>(key: Key, value: ProductFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const submit = (addAnother = false) => {
    setFormMessage(null);

    startSaving(async () => {
      const payload = {
        categoryId: form.categoryId || null,
        description: form.description,
        gallery: form.gallery,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        name: form.name,
        optionGroupId: form.optionGroupId || null,
        optionSettings: selectedGroup
          ? selectedGroup.options.map((option) => ({
              isRequired: option.isRequired,
              optionId: option.id,
            }))
          : [],
        sku: form.sku.trim(),
        slug: form.slug.trim(),
        sortOrder: Number.isFinite(form.sortOrder) ? Math.max(0, Math.round(form.sortOrder)) : 0,
        supportsNameCustomization: null,
        tags: form.tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      const result = await saveProductAction(
        locale,
        form.id ? { ...payload, id: form.id } : payload
      );

      if (!result.ok) {
        const fieldErrors = result.fieldErrors ?? {};
        setErrors(fieldErrors);
        setFormMessage(result.message);

        if (advancedFields.some((field) => fieldErrors[field])) {
          setShowAdvanced(true);
        }

        const firstKey = Object.keys(fieldErrors)[0];
        if (firstKey) {
          window.setTimeout(() => document.getElementById(firstKey)?.focus(), 50);
        }
        return;
      }

      onSaved(result.message, { addAnother, categoryId: form.categoryId });
    });
  };

  return (
    <AdminDrawer
      open
      onClose={onClose}
      title={isNew ? t("titleNew") : t("titleEdit")}
      description={isNew ? t("descriptionNew") : form.name[locale] || form.name.de}
      footer={
        <div className="space-y-3">
          {formMessage ? (
            <p role="alert" className="text-sm text-rose-300">
              {formMessage}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {onDelete ? (
              <AdminButton
                variant="ghost"
                className="text-rose-300 hover:text-rose-200"
                onClick={async () => {
                  if (await onDelete()) onClose();
                }}
              >
                <Trash2 />
                {tc("buttons.delete")}
              </AdminButton>
            ) : (
              <span className="text-xs text-muted">{t("requiredHint")}</span>
            )}
            <div className="ms-auto flex flex-wrap justify-end gap-2">
              <AdminButton variant="ghost" onClick={onClose}>
                {tc("buttons.cancel")}
              </AdminButton>
              {isNew ? (
                <AdminButton variant="secondary" onClick={() => submit(true)} disabled={isSaving || isUploading}>
                  {t("saveAndNext")}
                </AdminButton>
              ) : null}
              <AdminButton variant="primary" onClick={() => submit()} disabled={isSaving || isUploading}>
                {isSaving ? t("saving") : isNew ? t("create") : t("save")}
              </AdminButton>
            </div>
          </div>
        </div>
      }
    >
      <AdminFormSection title={t("photosTitle")} hint={t("photosHint")}>
        <AdminImageUploader
          multiple
          folder={uploadFolder}
          images={form.gallery}
          onChange={(gallery) => update("gallery", gallery)}
          onUploadingChange={setIsUploading}
        />
      </AdminFormSection>

      <AdminFormSection title={t("textTitle")} hint={t("textHint")}>
        <AdminTranslationFields
          errors={errors}
          fields={[
            { key: "name", label: t("nameLabel"), required: true, value: form.name },
            {
              key: "description",
              label: t("descriptionLabel"),
              multiline: true,
              value: form.description,
            },
          ]}
          onChange={(fieldKey, fieldLocale, value) => {
            const key = fieldKey as "name" | "description";
            setForm((current) => ({
              ...current,
              [key]: { ...current[key], [fieldLocale]: value },
            }));
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

      <AdminFormSection title={t("categoryTitle")} hint={t("categoryHint")}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("categoryLabel")} id="categoryId">
          {categoryChoices.map((category) => {
            const selected = form.categoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className="admin-chip"
                onClick={() => update("categoryId", selected ? "" : category.id)}
              >
                {selected ? <Check className="h-3.5 w-3.5" /> : null}
                {category.name}
                {category.hidden ? <span className="text-xs opacity-70">({tc("common.hidden")})</span> : null}
              </button>
            );
          })}
          {newCategoryOpen ? (
            <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <input
                autoFocus
                className="admin-input h-9 w-56 py-1.5"
                placeholder={t("newCategoryPlaceholder")}
                aria-label={t("newCategory")}
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    createCategoryInline();
                  }
                  if (event.key === "Escape") setNewCategoryOpen(false);
                }}
              />
              <AdminButton size="sm" variant="primary" onClick={createCategoryInline} disabled={isCreatingCategory || !newCategoryName.trim()}>
                {t("newCategoryCreate")}
              </AdminButton>
              <AdminButton size="sm" variant="ghost" onClick={() => setNewCategoryOpen(false)}>
                {tc("buttons.cancel")}
              </AdminButton>
            </span>
          ) : (
            <button type="button" className="admin-chip border-dashed" onClick={() => setNewCategoryOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              {t("newCategory")}
            </button>
          )}
        </div>
        {errors.categoryId ? (
          <p role="alert" className="mt-2 text-xs text-rose-300">
            {errors.categoryId}
          </p>
        ) : null}
      </AdminFormSection>

      <AdminFormSection title={t("customerTitle")} hint={t("customerHint")}>
        <div className="grid gap-2" role="radiogroup" aria-label={t("customerTitle")}>
          {[{ displayName: t("noOptionGroup"), id: "", options: [] as AdminOptionGroupRecord["options"] }, ...groups].map((group) => {
            const selected = form.optionGroupId === group.id;
            return (
              <button
                key={group.id || "none"}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update("optionGroupId", group.id)}
                className={`flex items-start gap-3 rounded-[0.75rem] border px-3.5 py-3 text-start transition ${
                  selected ? "border-gold/50 bg-gold/[0.07]" : "border-white/[0.07] hover:border-white/15"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-gold bg-gold" : "border-white/30"
                  }`}
                >
                  {selected ? <span className="h-1.5 w-1.5 rounded-full bg-[#1a1209]" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{group.displayName}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {group.id
                      ? group.options.length > 0
                        ? group.options.map((option) => option.displayLabel).join(", ")
                        : t("optionGroupEmpty")
                      : t("noOptionGroupHint")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <Link href="/admin/options" className="admin-button admin-button-ghost admin-button-sm mt-3">
          <Settings2 />
          {t("manageQuestions")}
        </Link>
      </AdminFormSection>

      <AdminFormSection title={t("visibilityTitle")}>
        <div className="space-y-3">
          <AdminSwitch
            checked={form.isActive}
            onChange={(checked) => update("isActive", checked)}
            label={t("visibleLabel")}
            description={t("visibleHint")}
          />
          <AdminSwitch
            checked={form.isFeatured}
            onChange={(checked) => update("isFeatured", checked)}
            label={t("featuredLabel")}
            description={t("featuredHint")}
          />
        </div>
      </AdminFormSection>

      <section className="admin-form-section">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-start"
          aria-expanded={showAdvanced || advancedHasError}
          onClick={() => setShowAdvanced((current) => !current)}
        >
          <span>
            <span className="admin-form-section-title block">{t("advancedTitle")}</span>
            <span className="admin-form-section-hint block">{t("advancedHint")}</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted transition ${showAdvanced || advancedHasError ? "rotate-180" : ""}`}
          />
        </button>
        {showAdvanced || advancedHasError ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminInput
              id="sku"
              dir="ltr"
              label={t("skuLabel")}
              helperText={t("skuHelper")}
              placeholder={t("skuPlaceholder")}
              value={form.sku}
              errorText={errors.sku}
              onChange={(event) => update("sku", event.target.value)}
            />
            <AdminInput
              id="slug"
              dir="ltr"
              label={t("slugLabel")}
              helperText={t("slugHelper")}
              value={form.slug}
              errorText={errors.slug}
              onChange={(event) => update("slug", event.target.value)}
            />
            <AdminInput
              id="sortOrder"
              type="number"
              min={0}
              label={t("sortOrderLabel")}
              helperText={t("sortOrderHelper")}
              value={String(form.sortOrder)}
              errorText={errors.sortOrder}
              onChange={(event) => update("sortOrder", Number(event.target.value || 0))}
            />
            <AdminInput
              id="tags"
              label={t("tagsLabel")}
              helperText={t("tagsHelper")}
              value={form.tagsText}
              errorText={errors.tags}
              onChange={(event) => update("tagsText", event.target.value)}
            />
          </div>
        ) : null}
      </section>
    </AdminDrawer>
  );
}
