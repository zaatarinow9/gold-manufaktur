"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  deleteProductAction,
  duplicateProductAction,
  saveProductAction,
  toggleProductActiveAction,
  toggleProductFeaturedAction,
} from "@/app/[locale]/admin/products/actions";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
  scrollCardIntoView,
} from "@/lib/admin/clientForm";
import type {
  AdminCategoryRecord,
  AdminOptionGroupRecord,
  AdminProductRecord,
  LocalizedText,
} from "@/lib/db/adminCatalog";
import {
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_UPLOAD_QUALITY,
} from "@/lib/product-images";

type ProductFormState = {
  categoryId: string;
  description: LocalizedText;
  galleryText: string;
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

type AdminProductsClientProps = {
  categories: AdminCategoryRecord[];
  groups: AdminOptionGroupRecord[];
  locale: AppLocale;
  products: AdminProductRecord[];
};

const lastOptionGroupStorageKey = "goldhelwah.admin.last-option-group";

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
  products: AdminProductRecord[],
  optionGroupId = ""
): ProductFormState {
  return {
    categoryId: categories[0]?.id ?? "",
    description: createEmptyLocalizedText(),
    galleryText: "",
    isActive: true,
    isFeatured: false,
    name: createEmptyLocalizedText(),
    optionGroupId,
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
    optionGroupId: product.optionGroupId ?? "",
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

function appendGalleryUrls(value: string, imageUrls: string[]) {
  return [...splitTextareaLines(value), ...imageUrls].join("\n");
}

function removeGalleryUrl(value: string, imageUrl: string) {
  return splitTextareaLines(value)
    .filter((currentUrl) => currentUrl !== imageUrl)
    .join("\n");
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = src;
  });
}

async function compressProductImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const scale = Math.min(1, PRODUCT_IMAGE_MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("CANVAS_UNAVAILABLE");
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error("COMPRESSION_FAILED"));
            return;
          }

          resolve(result);
        },
        "image/webp",
        PRODUCT_IMAGE_UPLOAD_QUALITY
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/u, "") || "product-image";
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

function getStoredOptionGroupId(groups: AdminOptionGroupRecord[]) {
  if (typeof window === "undefined") {
    return "";
  }

  const stored = window.localStorage.getItem(lastOptionGroupStorageKey);

  if (!stored) {
    return "";
  }

  return groups.some((group) => group.id === stored) ? stored : "";
}

function saveStoredOptionGroupId(optionGroupId: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!optionGroupId) {
    window.localStorage.removeItem(lastOptionGroupStorageKey);
    return;
  }

  window.localStorage.setItem(lastOptionGroupStorageKey, optionGroupId);
}

function getProductUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      categoryDefault: "يتبع التصنيف",
      deleteConfirm:
        "هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذه العملية.",
      galleryEmpty: "لم تتم إضافة صور لهذا المنتج بعد.",
      galleryHelper: "يمكنك لصق رابط في كل سطر أو رفع صور مضغوطة مباشرة.",
      galleryLabel: "صور المعرض",
      galleryPreview: "معاينة الصور",
      galleryRemove: "إزالة",
      noGroup: "بدون مجموعة خيارات",
      optionGroupDescription:
        "اختر مجموعة واحدة فقط لهذا المنتج. ستظهر حقولها في الطلبات والاستفسارات العامة.",
      optionGroupLabel: "مجموعة الخيارات",
      optionGroupPreview: "معاينة الحقول المرتبطة",
      personalizationBadge: "يدعم تخصيص الاسم",
      personalizationHeader: "التخصيص",
      tagsHelper: "افصل الكلمات المفتاحية بفواصل.",
      uploadButton: "رفع صور",
      uploadFailed: "تعذر رفع الصورة. يرجى المحاولة مرة أخرى.",
      uploadHelper: "يتم ضغط الصور إلى WebP قبل الحفظ.",
      uploadInvalidType: "يرجى اختيار ملفات صور فقط.",
      uploadPending: "جارٍ ضغط الصور ورفعها...",
      uploadTooLarge: "الصورة كبيرة جداً بعد الضغط. يرجى اختيار صورة أصغر.",
    };
  }

  if (locale === "de") {
    return {
      categoryDefault: "Kategorie-Standard",
      deleteConfirm:
        "Soll dieses Produkt wirklich geloescht werden? Diese Aktion kann nicht rueckgaengig gemacht werden.",
      galleryEmpty: "Fuer dieses Produkt wurden noch keine Bilder hinzugefuegt.",
      galleryHelper:
        "Fuegen Sie pro Zeile einen Bildlink ein oder laden Sie komprimierte Bilder direkt hoch.",
      galleryLabel: "Galeriebilder",
      galleryPreview: "Bildvorschau",
      galleryRemove: "Entfernen",
      noGroup: "Keine Optionsgruppe",
      optionGroupDescription:
        "Waehlen Sie genau eine Gruppe fuer dieses Produkt. Ihre Felder erscheinen dann in Auftragserfassung und Anfragen.",
      optionGroupLabel: "Optionsgruppe",
      optionGroupPreview: "Feldvorschau",
      personalizationBadge: "Namenspersonalisierung",
      personalizationHeader: "Personalisierung",
      tagsHelper: "Tags mit Kommas trennen.",
      uploadButton: "Bilder hochladen",
      uploadFailed: "Das Bild konnte nicht hochgeladen werden. Bitte versuchen Sie es erneut.",
      uploadHelper: "Bilder werden vor dem Speichern zu WebP komprimiert.",
      uploadInvalidType: "Bitte waehlen Sie nur Bilddateien aus.",
      uploadPending: "Bilder werden komprimiert und hochgeladen...",
      uploadTooLarge: "Das Bild ist nach der Komprimierung noch zu gross. Bitte waehlen Sie eine kleinere Datei.",
    };
  }

  return {
    categoryDefault: "Category default",
    deleteConfirm:
      "Do you really want to delete this product? This action cannot be undone.",
    galleryEmpty: "No images have been added for this product yet.",
    galleryHelper: "Add one image URL per line or upload compressed images directly.",
    galleryLabel: "Gallery images",
    galleryPreview: "Image preview",
    galleryRemove: "Remove",
    noGroup: "No option group",
    optionGroupDescription:
      "Choose one group for this product. Its fields will appear in order entry and public inquiries.",
    optionGroupLabel: "Option group",
    optionGroupPreview: "Field preview",
    personalizationBadge: "Name personalization",
    personalizationHeader: "Personalization",
    tagsHelper: "Separate tags with commas.",
    uploadButton: "Upload images",
    uploadFailed: "The image could not be uploaded right now. Please try again.",
    uploadHelper: "Images are compressed to WebP before they are saved.",
    uploadInvalidType: "Please choose image files only.",
    uploadPending: "Compressing and uploading images...",
    uploadTooLarge: "The compressed image is still too large. Please choose a smaller file.",
  };
}

export function AdminProductsClient({
  categories,
  groups,
  locale,
  products,
}: AdminProductsClientProps) {
  const t = useTranslations("Admin");
  const uiCopy = getProductUiCopy(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploadingImages, startUploadTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(() =>
    createEmptyProductForm(categories, products)
  );
  const editorRef = useRef<HTMLDivElement | null>(null);
  const requiredLabel = getRequiredFieldBadge(locale);
  const galleryUrls = useMemo(
    () => splitTextareaLines(formState.galleryText),
    [formState.galleryText]
  );
  const selectedCategory =
    categories.find((category) => category.id === formState.categoryId) ?? null;
  const selectedGroup =
    groups.find((group) => group.id === formState.optionGroupId) ?? null;
  const inheritedCustomizationEnabled =
    selectedCategory?.supportsNameCustomization ?? false;

  useEffect(() => {
    if (!editorOpen || !editorRef.current) {
      return;
    }

    scrollCardIntoView(editorRef.current);
  }, [editorOpen, editingProductId]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const normalizedSearch = search.toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          product.displayName.toLowerCase().includes(normalizedSearch) ||
          product.sku.toLowerCase().includes(normalizedSearch) ||
          product.slug.toLowerCase().includes(normalizedSearch) ||
          product.optionGroupName.toLowerCase().includes(normalizedSearch);
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
    [categoryFilter, featuredFilter, products, search, statusFilter, tab]
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
    setFormState(createEmptyProductForm(categories, products));
    setEditingProductId(null);
    setUploadError(null);
    setEditorOpen(false);
  };

  const submitForm = () => {
    const derivedOptionSettings = selectedGroup
      ? selectedGroup.options.map((option) => ({
          isRequired: option.isRequired,
          optionId: option.id,
        }))
      : [];
    const payload = {
      categoryId: formState.categoryId || null,
      description: formState.description,
      gallery: splitTextareaLines(formState.galleryText),
      isActive: formState.isActive,
      isFeatured: formState.isFeatured,
      name: formState.name,
      optionGroupId: formState.optionGroupId || null,
      optionSettings: derivedOptionSettings,
      sku: formState.sku.trim(),
      slug: formState.slug.trim(),
      sortOrder: Number(formState.sortOrder),
      supportsNameCustomization: null,
      tags: splitCommaList(formState.tagsText),
    };

    startTransition(async () => {
      const result = formState.id
        ? await saveProductAction(locale, { ...payload, id: formState.id })
        : await saveProductAction(locale, payload);

      setFieldErrors(result.fieldErrors ?? {});
      setFeedback(result.message);

      if (!result.ok) {
        focusFirstInvalidField(result.fieldErrors ?? {});
        return;
      }

      if (formState.optionGroupId) {
        saveStoredOptionGroupId(formState.optionGroupId);
      }

      resetForm();
      router.refresh();
    });
  };

  const uploadGalleryImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const hasInvalidFile = files.some(
      (file) =>
        !PRODUCT_IMAGE_ALLOWED_MIME_TYPES.includes(
          file.type as (typeof PRODUCT_IMAGE_ALLOWED_MIME_TYPES)[number]
        )
    );

    if (hasInvalidFile) {
      setUploadError(uiCopy.uploadInvalidType);
      return;
    }

    setUploadError(null);

    startUploadTransition(async () => {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        try {
          const compressedFile = await compressProductImage(file);
          const body = new FormData();

          body.set("file", compressedFile);
          body.set("productSku", formState.sku.trim());
          body.set("productSlug", formState.slug.trim());

          const response = await fetch("/api/admin/product-images", {
            body,
            method: "POST",
          });
          const payload = (await response.json().catch(() => null)) as
            | { error?: string; success?: boolean; url?: string }
            | null;

          if (!response.ok || !payload?.success || !payload.url) {
            throw new Error(
              payload?.error === "FILE_TOO_LARGE"
                ? uiCopy.uploadTooLarge
                : payload?.error === "INVALID_FILE_TYPE"
                  ? uiCopy.uploadInvalidType
                  : uiCopy.uploadFailed
            );
          }

          uploadedUrls.push(payload.url);
        } catch (error) {
          setUploadError(
            error instanceof Error && error.message.trim().length > 0
              ? error.message
              : uiCopy.uploadFailed
          );
        }
      }

      if (uploadedUrls.length > 0) {
        setFormState((current) => ({
          ...current,
          galleryText: appendGalleryUrls(current.galleryText, uploadedUrls),
        }));
      }
    });
  };

  const openCreateForm = () => {
    const storedGroupId = getStoredOptionGroupId(groups);
    setFeedback(null);
    setFieldErrors({});
    setUploadError(null);
    setEditingProductId("new");
    setFormState(createEmptyProductForm(categories, products, storedGroupId));
    setEditorOpen(true);
  };

  const columns: AdminTableColumn<AdminProductRecord>[] = [
    {
      id: "product",
      header: t("products.table.product"),
      cell: (product) => (
        <div className="flex items-center gap-3">
          <div className="relative h-[72px] w-[72px] overflow-hidden rounded-[0.9rem] border border-white/10 bg-white/4">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.displayName}
                fill
                className="object-cover"
                sizes="72px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted">
                GH
              </div>
            )}
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
      id: "optionGroup",
      header: uiCopy.optionGroupLabel,
      cell: (product) =>
        product.optionGroupName ? (
          <AdminBadge variant="gold">{product.optionGroupName}</AdminBadge>
        ) : (
          <AdminBadge variant="neutral">{uiCopy.noGroup}</AdminBadge>
        ),
    },
    {
      id: "personalization",
      header: uiCopy.personalizationHeader,
      cell: (product) => (
        <div className="flex flex-wrap gap-2">
          {product.effectiveSupportsNameCustomization ? (
            <AdminBadge variant="gold">{uiCopy.personalizationBadge}</AdminBadge>
          ) : (
            <AdminBadge variant="neutral">{t("common.disabled")}</AdminBadge>
          )}
          {product.nameCustomizationMode === "category" ? (
            <AdminBadge variant="neutral">{uiCopy.categoryDefault}</AdminBadge>
          ) : null}
        </div>
      ),
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
      id: "actions",
      align: "end",
      header: t("products.table.actions"),
      cell: (product) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() => {
              setFeedback(null);
              setFieldErrors({});
              setUploadError(null);
              setEditingProductId(product.id);
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
          <AdminButton
            size="sm"
            variant="danger"
            onClick={() => {
              if (!window.confirm(uiCopy.deleteConfirm)) {
                return;
              }

              startTransition(async () => {
                const result = await deleteProductAction(locale, product.id);
                setFeedback(result.message);
                if (result.ok) {
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
        <div ref={editorRef}>
          <AdminCard
            title={formState.id ? t("buttons.edit") : t("buttons.addProduct")}
            description={t("products.description")}
            action={
              <div className="flex gap-2">
                <AdminButton variant="ghost" onClick={resetForm}>
                  {t("buttons.close")}
                </AdminButton>
                <AdminButton
                  variant="primary"
                  onClick={submitForm}
                  disabled={isPending || isUploadingImages}
                >
                  {t("buttons.save")}
                </AdminButton>
              </div>
            }
          >
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-2">
                <AdminInput
                  id="sku"
                  name="sku"
                  label="SKU"
                  value={formState.sku}
                  required
                  requiredLabel={requiredLabel}
                  errorText={fieldErrors.sku}
                  onChange={(event) => {
                    clearFieldError("sku");
                    setFormState((current) => ({ ...current, sku: event.target.value }));
                  }}
                />
                <AdminInput
                  id="slug"
                  name="slug"
                  label="Slug"
                  value={formState.slug}
                  errorText={fieldErrors.slug}
                  helperText={
                    !fieldErrors.slug
                      ? locale === "de"
                        ? "Leer lassen, wenn der Slug automatisch erzeugt werden soll."
                        : "Leave empty to generate the slug automatically."
                      : undefined
                  }
                  onChange={(event) => {
                    clearFieldError("slug");
                    setFormState((current) => ({ ...current, slug: event.target.value }));
                  }}
                />
                <AdminSelect
                  id="categoryId"
                  name="categoryId"
                  label={t("filters.category")}
                  value={formState.categoryId}
                  errorText={fieldErrors.categoryId}
                  onChange={(event) => {
                    clearFieldError("categoryId");
                    setFormState((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }));
                  }}
                >
                  <option value="">{t("common.all")}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.displayName}
                    </option>
                  ))}
                </AdminSelect>
                <AdminSelect
                  id="optionGroupId"
                  name="optionGroupId"
                  label={uiCopy.optionGroupLabel}
                  value={formState.optionGroupId}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setFormState((current) => ({
                      ...current,
                      optionGroupId: nextValue,
                    }));
                    saveStoredOptionGroupId(nextValue);
                  }}
                >
                  <option value="">{uiCopy.noGroup}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.displayName}
                    </option>
                  ))}
                </AdminSelect>
                <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4">
                  <p className="admin-label">{uiCopy.personalizationHeader}</p>
                  <p className="mt-2 text-sm text-foreground">
                    {locale === "de"
                      ? "Namenspersonalisierung wird weiterhin ueber die Kategorie gesteuert."
                      : locale === "ar"
                        ? "يستمر تخصيص الاسم بالاعتماد على إعدادات التصنيف."
                        : "Name personalization still follows the category settings."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminBadge variant={inheritedCustomizationEnabled ? "gold" : "neutral"}>
                      {inheritedCustomizationEnabled
                        ? uiCopy.personalizationBadge
                        : t("common.disabled")}
                    </AdminBadge>
                    {selectedCategory ? (
                      <AdminBadge variant="neutral">{selectedCategory.displayName}</AdminBadge>
                    ) : null}
                  </div>
                </div>
                <AdminInput
                  id="sortOrder"
                  name="sortOrder"
                  label="Sort Order"
                  type="number"
                  value={String(formState.sortOrder)}
                  errorText={fieldErrors.sortOrder}
                  onChange={(event) => {
                    clearFieldError("sortOrder");
                    setFormState((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value || 0),
                    }));
                  }}
                />
              </div>

              <AdminCard
                title={uiCopy.optionGroupLabel}
                description={uiCopy.optionGroupDescription}
              >
                {selectedGroup ? (
                  <div className="grid gap-3">
                    {selectedGroup.options.map((option) => (
                      <div
                        key={option.id}
                        className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{option.displayLabel}</p>
                            <p className="text-xs text-muted">
                              {option.key} {" · "} {option.type.replace(/_/g, " ")}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {option.isRequired ? (
                              <AdminBadge variant="gold">{t("common.required")}</AdminBadge>
                            ) : null}
                            <AdminBadge variant={option.isActive ? "success" : "neutral"}>
                              {option.isActive ? t("common.active") : t("common.inactive")}
                            </AdminBadge>
                          </div>
                        </div>
                        {option.helpText.de || option.helpText.ar ? (
                          <p className="mt-3 text-sm text-muted">
                            {option.helpText.de || option.helpText.ar}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">{uiCopy.noGroup}</p>
                )}
              </AdminCard>

              <div className="grid gap-4 xl:grid-cols-2">
                {(["de", "ar", "en", "fr", "tr"] as const).map((language) => (
                  <AdminInput
                    key={`name-${language}`}
                    id={`name.${language}`}
                    name={`name.${language}`}
                    label={`Name ${language.toUpperCase()}`}
                    value={formState.name[language]}
                    required={language === "de" || language === "ar"}
                    requiredLabel={
                      language === "de" || language === "ar" ? requiredLabel : undefined
                    }
                    errorText={fieldErrors[`name.${language}`]}
                    onChange={(event) => {
                      clearFieldError(`name.${language}`);
                      setFormState((current) => ({
                        ...current,
                        name: updateLocalizedText(
                          current.name,
                          language,
                          event.target.value
                        ),
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
              </div>

              <AdminTextarea
                id="tags"
                name="tags"
                label="Tags"
                helperText={uiCopy.tagsHelper}
                errorText={fieldErrors.tags}
                value={formState.tagsText}
                onChange={(event) => {
                  clearFieldError("tags");
                  setFormState((current) => ({
                    ...current,
                    tagsText: event.target.value,
                  }));
                }}
              />

              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <AdminTextarea
                    id="gallery"
                    name="gallery"
                    label={uiCopy.galleryLabel}
                    errorText={fieldErrors.gallery}
                    helperText={!fieldErrors.gallery ? uiCopy.galleryHelper : undefined}
                    value={formState.galleryText}
                    onChange={(event) => {
                      clearFieldError("gallery");
                      setFormState((current) => ({
                        ...current,
                        galleryText: event.target.value,
                      }));
                    }}
                  />
                  <label className="block space-y-2">
                    <span className="admin-label">{uiCopy.uploadButton}</span>
                    <div className="rounded-[1rem] border border-dashed border-white/12 bg-white/4 px-4 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-sm font-medium text-gold-soft transition hover:border-gold/40 hover:text-foreground">
                          {isUploadingImages ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {uiCopy.uploadButton}
                          <input
                            type="file"
                            accept={PRODUCT_IMAGE_ALLOWED_MIME_TYPES.join(",")}
                            multiple
                            className="hidden"
                            onChange={uploadGalleryImages}
                          />
                        </label>
                        <p className="text-sm text-muted">
                          {isUploadingImages ? uiCopy.uploadPending : uiCopy.uploadHelper}
                        </p>
                      </div>
                      {uploadError ? (
                        <p className="mt-3 text-sm text-rose-300">{uploadError}</p>
                      ) : null}
                    </div>
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="admin-label">{uiCopy.galleryPreview}</p>
                    <p className="text-xs text-muted">{uiCopy.galleryHelper}</p>
                  </div>
                  {galleryUrls.length === 0 ? (
                    <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4 text-sm text-muted">
                      {uiCopy.galleryEmpty}
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {galleryUrls.map((imageUrl) => (
                        <div
                          key={imageUrl}
                          className="overflow-hidden rounded-[1rem] border border-white/8 bg-black/10"
                        >
                          <div className="relative aspect-[4/4.8] bg-black/30">
                            <Image
                              src={imageUrl}
                              alt={formState.name.de || formState.sku || "Product image"}
                              fill
                              className="object-cover"
                              sizes="(min-width: 1280px) 18vw, 40vw"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 px-3 py-3">
                            <p className="min-w-0 truncate text-xs text-muted">{imageUrl}</p>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs font-medium text-gold-soft transition hover:text-foreground"
                              onClick={() =>
                                setFormState((current) => ({
                                  ...current,
                                  galleryText: removeGalleryUrl(
                                    current.galleryText,
                                    imageUrl
                                  ),
                                }))
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                              {uiCopy.galleryRemove}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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
        </div>
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
