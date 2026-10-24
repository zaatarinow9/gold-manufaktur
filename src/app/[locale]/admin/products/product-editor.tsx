"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { saveProductAction } from "@/app/[locale]/admin/products/actions";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminDrawer, AdminFormSection } from "@/components/admin/AdminDrawer";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminSwitch } from "@/components/admin/AdminSwitch";
import { AdminTranslationFields } from "@/components/admin/AdminTranslationFields";
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
  onSaved: (message: string) => void;
};

export function ProductEditor({
  categories,
  groups,
  initialState,
  locale,
  onClose,
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

  const submit = () => {
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
            <p role="alert" className="text-sm text-rose-300">
              {formMessage}
            </p>
          ) : (
            <span className="text-xs text-muted">{t("requiredHint")}</span>
          )}
          <div className="ms-auto flex gap-2">
            <AdminButton variant="ghost" onClick={onClose}>
              {tc("buttons.cancel")}
            </AdminButton>
            <AdminButton variant="primary" onClick={submit} disabled={isSaving || isUploading}>
              {isSaving ? t("saving") : isNew ? t("create") : t("save")}
            </AdminButton>
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

      <AdminFormSection title={t("categoryTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminSelect
            id="categoryId"
            label={t("categoryLabel")}
            value={form.categoryId}
            errorText={errors.categoryId}
            onChange={(event) => update("categoryId", event.target.value)}
          >
            <option value="">{t("noCategory")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.displayName}
                {category.isActive ? "" : ` (${tc("common.hidden")})`}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            id="optionGroupId"
            label={t("optionGroupLabel")}
            helperText={t("optionGroupHelper")}
            value={form.optionGroupId}
            onChange={(event) => update("optionGroupId", event.target.value)}
          >
            <option value="">{t("noOptionGroup")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.displayName}
              </option>
            ))}
          </AdminSelect>
        </div>
        {selectedGroup ? (
          <div className="mt-3 rounded-[0.625rem] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-muted">
            {selectedGroup.options.length > 0
              ? t("optionGroupPreview", {
                  fields: selectedGroup.options.map((option) => option.displayLabel).join(", "),
                })
              : t("optionGroupEmpty")}
          </div>
        ) : null}
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
