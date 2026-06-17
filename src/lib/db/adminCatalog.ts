import "server-only";

import { z } from "zod";

import type { AppLocale } from "@/i18n/routing";
import type { OptionType } from "@/types/admin";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TableInsert, TableRow, TableUpdate } from "@/lib/supabase/types";

const localeKeys = ["de", "ar", "en", "fr", "tr"] as const;

type LocaleKey = (typeof localeKeys)[number];

export type LocalizedText = Record<LocaleKey, string>;

export type AdminCategoryRecord = {
  accent: string;
  description: LocalizedText;
  displayDescription: string;
  displayName: string;
  id: string;
  imageUrl: string;
  isActive: boolean;
  name: LocalizedText;
  optionCount: number;
  optionIds: string[];
  productCount: number;
  slug: string;
  sortOrder: number;
};

export type AdminProductRecord = {
  categoryId: string | null;
  categoryName: string;
  categorySlug: string;
  description: LocalizedText;
  displayDescription: string;
  displayName: string;
  gallery: string[];
  id: string;
  imageUrl: string;
  isActive: boolean;
  isFeatured: boolean;
  name: LocalizedText;
  optionCount: number;
  optionIds: string[];
  sku: string;
  slug: string;
  sortOrder: number;
  tags: string[];
};

export type AdminOptionGroupRecord = {
  displayName: string;
  id: string;
  isActive: boolean;
  key: string;
  name: LocalizedText;
  optionCount: number;
  sortOrder: number;
};

export type AdminOptionRecord = {
  categoryCount: number;
  displayLabel: string;
  groupId: string;
  groupKey: string;
  groupName: string;
  id: string;
  isActive: boolean;
  isRequired: boolean;
  key: string;
  label: LocalizedText;
  productCount: number;
  sortOrder: number;
  type: OptionType;
  values: Array<{ label: string; value: string }>;
};

function createOptionalTextSchema(maxLength = 4000) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => value ?? "");
}

const localizedRequiredSchema = z.object({
  de: z.string().trim().min(1).max(255),
  ar: z.string().trim().min(1).max(255),
  en: createOptionalTextSchema(255),
  fr: createOptionalTextSchema(255),
  tr: createOptionalTextSchema(255),
});

const localizedOptionalSchema = z.object({
  de: createOptionalTextSchema(),
  ar: createOptionalTextSchema(),
  en: createOptionalTextSchema(),
  fr: createOptionalTextSchema(),
  tr: createOptionalTextSchema(),
});

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const tagSchema = z.string().trim().min(1).max(64);
const imagePathSchema = z.string().trim().min(1).max(500);

const optionValueSchema = z.object({
  label: z.string().trim().min(1).max(255),
  value: z.string().trim().min(1).max(255),
});

export const categoryInputSchema = z.object({
  accent: createOptionalTextSchema(120),
  description: localizedOptionalSchema,
  imageUrl: createOptionalTextSchema(500),
  isActive: z.boolean().default(true),
  name: localizedRequiredSchema,
  slug: slugSchema,
  sortOrder: z.number().int().min(0).default(0),
});

export const categoryUpdateSchema = categoryInputSchema.extend({
  id: z.string().uuid(),
});

export const productInputSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  description: localizedOptionalSchema,
  gallery: z.array(imagePathSchema).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  name: localizedRequiredSchema,
  optionIds: z.array(z.string().uuid()).default([]),
  sku: z.string().trim().min(1).max(120),
  slug: slugSchema,
  sortOrder: z.number().int().min(0).default(0),
  tags: z.array(tagSchema).default([]),
});

export const productUpdateSchema = productInputSchema.extend({
  id: z.string().uuid(),
});

export const optionGroupInputSchema = z.object({
  isActive: z.boolean().default(true),
  key: slugSchema,
  name: localizedRequiredSchema,
  sortOrder: z.number().int().min(0).default(0),
});

export const optionInputSchema = z.object({
  groupId: z.string().uuid(),
  isActive: z.boolean().default(true),
  isRequired: z.boolean().default(false),
  key: slugSchema,
  label: localizedRequiredSchema,
  sortOrder: z.number().int().min(0).default(0),
  type: z.enum([
    "text",
    "textarea",
    "number",
    "select",
    "multi_select",
    "boolean",
    "date",
    "image",
    "file",
  ]),
  values: z.array(optionValueSchema).default([]),
});

export const optionUpdateSchema = optionInputSchema.extend({
  id: z.string().uuid(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type OptionGroupInput = z.infer<typeof optionGroupInputSchema>;
export type OptionInput = z.infer<typeof optionInputSchema>;
export type OptionUpdateInput = z.infer<typeof optionUpdateSchema>;

function emptyLocalizedText() {
  return {
    ar: "",
    de: "",
    en: "",
    fr: "",
    tr: "",
  } satisfies LocalizedText;
}

function logAdminReadError(scope: string, message: string) {
  console.error(`[adminCatalog] ${scope}: ${message}`);
}

function normalizeLocalizedText(fields: LocalizedText) {
  return {
    ar: fields.ar.trim(),
    de: fields.de.trim(),
    en: fields.en.trim(),
    fr: fields.fr.trim(),
    tr: fields.tr.trim(),
  } satisfies LocalizedText;
}

function nullableText(value: string) {
  return value.length > 0 ? value : null;
}

function getLocalizedFields<
  Prefix extends "description" | "label" | "name",
  Row extends Record<`${Prefix}_${LocaleKey}`, string | null>,
>(row: Row, prefix: Prefix) {
  const localized = emptyLocalizedText();

  localeKeys.forEach((locale) => {
    localized[locale] = row[`${prefix}_${locale}`] ?? "";
  });

  return localized;
}

function resolveLocalizedText(
  fields: LocalizedText,
  locale: AppLocale
) {
  const requested = fields[locale].trim();
  return requested.length > 0 ? requested : fields.de;
}

function getProductPrimaryImage(
  product: TableRow<"products">,
  gallery: string[]
) {
  if (product.cover_image_url) {
    return product.cover_image_url;
  }

  return gallery[0] ?? "";
}

function toCategoryInsert(input: CategoryInput | CategoryUpdateInput) {
  const name = normalizeLocalizedText(input.name);
  const description = normalizeLocalizedText(input.description);

  return {
    accent: nullableText(input.accent.trim()),
    description_ar: nullableText(description.ar),
    description_de: nullableText(description.de),
    description_en: nullableText(description.en),
    description_fr: nullableText(description.fr),
    description_tr: nullableText(description.tr),
    image_url: nullableText(input.imageUrl.trim()),
    is_active: input.isActive,
    name_ar: name.ar,
    name_de: name.de,
    name_en: nullableText(name.en),
    name_fr: nullableText(name.fr),
    name_tr: nullableText(name.tr),
    slug: input.slug,
    sort_order: input.sortOrder,
  };
}

function toProductInsert(input: ProductInput | ProductUpdateInput) {
  const name = normalizeLocalizedText(input.name);
  const description = normalizeLocalizedText(input.description);
  const tags = [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))];

  return {
    category_id: input.categoryId,
    cover_image_url: nullableText(
      (input.gallery[0] ?? "").trim()
    ),
    description_ar: nullableText(description.ar),
    description_de: nullableText(description.de),
    description_en: nullableText(description.en),
    description_fr: nullableText(description.fr),
    description_tr: nullableText(description.tr),
    is_active: input.isActive,
    is_featured: input.isFeatured,
    name_ar: name.ar,
    name_de: name.de,
    name_en: nullableText(name.en),
    name_fr: nullableText(name.fr),
    name_tr: nullableText(name.tr),
    sku: input.sku,
    slug: input.slug,
    sort_order: input.sortOrder,
    tags,
  };
}

function toOptionGroupInsert(input: OptionGroupInput) {
  const name = normalizeLocalizedText(input.name);

  return {
    is_active: input.isActive,
    key: input.key,
    name_ar: name.ar,
    name_de: name.de,
    name_en: nullableText(name.en),
    name_fr: nullableText(name.fr),
    name_tr: nullableText(name.tr),
    sort_order: input.sortOrder,
  } satisfies TableInsert<"option_groups">;
}

function toOptionInsert(input: OptionInput | OptionUpdateInput) {
  const label = normalizeLocalizedText(input.label);
  const values = input.values
    .map((value) => ({
      label: value.label.trim(),
      value: value.value.trim(),
    }))
    .filter((value) => value.label.length > 0 && value.value.length > 0);

  return {
    group_id: input.groupId,
    is_active: input.isActive,
    is_required: input.isRequired,
    key: input.key,
    label_ar: label.ar,
    label_de: label.de,
    label_en: nullableText(label.en),
    label_fr: nullableText(label.fr),
    label_tr: nullableText(label.tr),
    sort_order: input.sortOrder,
    type: input.type,
    values_json: values,
  } satisfies TableInsert<"options"> | TableUpdate<"options">;
}

async function loadCategoryRows() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logAdminReadError("categories", error.message);
    return [];
  }

  return data;
}

async function loadProductRows() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logAdminReadError("products", error.message);
    return [];
  }

  return data;
}

async function loadProductImages(productIds?: string[]) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("product_images")
    .select("product_id, image_url, sort_order")
    .order("sort_order", { ascending: true });

  if (productIds && productIds.length > 0) {
    query = query.in("product_id", productIds);
  }

  const { data, error } = await query;

  if (error) {
    logAdminReadError("product images", error.message);
    return [];
  }

  return data;
}

async function loadProductOptions() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_options")
    .select("product_id, option_id, is_required");

  if (error) {
    logAdminReadError("product options", error.message);
    return [];
  }

  return data;
}

async function loadOptionRows() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("options")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logAdminReadError("options", error.message);
    return [];
  }

  return data;
}

async function loadOptionGroupRows() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("option_groups")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logAdminReadError("option groups", error.message);
    return [];
  }

  return data;
}

export async function getPublicCategoryLookup() {
  const categories = await loadCategoryRows();
  return new Map(categories.map((category) => [category.id, category]));
}

export async function getAdminCategories(
  locale: AppLocale = "de"
): Promise<AdminCategoryRecord[]> {
  const [categories, products, productOptions] = await Promise.all([
    loadCategoryRows(),
    loadProductRows(),
    loadProductOptions(),
  ]);

  const productIdsByCategory = new Map<string, string[]>();
  const optionIdsByProduct = new Map<string, string[]>();

  products.forEach((product) => {
    if (!product.category_id) {
      return;
    }

    const current = productIdsByCategory.get(product.category_id) ?? [];
    current.push(product.id);
    productIdsByCategory.set(product.category_id, current);
  });

  productOptions.forEach((assignment) => {
    const current = optionIdsByProduct.get(assignment.product_id) ?? [];
    current.push(assignment.option_id);
    optionIdsByProduct.set(assignment.product_id, current);
  });

  return categories.map((category) => {
    const name = getLocalizedFields(category, "name");
    const description = getLocalizedFields(category, "description");
    const productIds = productIdsByCategory.get(category.id) ?? [];
    const optionIds = [
      ...new Set(
        productIds.flatMap((productId) => optionIdsByProduct.get(productId) ?? [])
      ),
    ];

    return {
      accent: category.accent ?? "",
      description,
      displayDescription: resolveLocalizedText(description, locale),
      displayName: resolveLocalizedText(name, locale),
      id: category.id,
      imageUrl: category.image_url ?? "",
      isActive: category.is_active,
      name,
      optionCount: optionIds.length,
      optionIds,
      productCount: productIds.length,
      slug: category.slug,
      sortOrder: category.sort_order,
    };
  });
}

export async function getAdminProducts(
  locale: AppLocale = "de"
): Promise<AdminProductRecord[]> {
  const [products, categories, images, productOptions] = await Promise.all([
    loadProductRows(),
    loadCategoryRows(),
    loadProductImages(),
    loadProductOptions(),
  ]);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const galleryByProductId = new Map<string, string[]>();
  const optionIdsByProduct = new Map<string, string[]>();

  images.forEach((image) => {
    const current = galleryByProductId.get(image.product_id) ?? [];
    current.push(image.image_url);
    galleryByProductId.set(image.product_id, current);
  });

  productOptions.forEach((assignment) => {
    const current = optionIdsByProduct.get(assignment.product_id) ?? [];
    current.push(assignment.option_id);
    optionIdsByProduct.set(assignment.product_id, current);
  });

  return products.map((product) => {
    const name = getLocalizedFields(product, "name");
    const description = getLocalizedFields(product, "description");
    const category = product.category_id ? categoryById.get(product.category_id) : null;
    const categoryName = category
      ? resolveLocalizedText(getLocalizedFields(category, "name"), locale)
      : "";
    const categorySlug = category?.slug ?? "";
    const gallery = galleryByProductId.get(product.id) ?? [];
    const optionIds = optionIdsByProduct.get(product.id) ?? [];

    return {
      categoryId: product.category_id,
      categoryName,
      categorySlug,
      description,
      displayDescription: resolveLocalizedText(description, locale),
      displayName: resolveLocalizedText(name, locale),
      gallery,
      id: product.id,
      imageUrl: getProductPrimaryImage(product, gallery),
      isActive: product.is_active,
      isFeatured: product.is_featured,
      name,
      optionCount: optionIds.length,
      optionIds,
      sku: product.sku,
      slug: product.slug,
      sortOrder: product.sort_order,
      tags: product.tags ?? [],
    };
  });
}

export async function getAdminOptions(
  locale: AppLocale = "de"
): Promise<AdminOptionRecord[]> {
  const [options, groups, products, productOptions] = await Promise.all([
    loadOptionRows(),
    loadOptionGroupRows(),
    loadProductRows(),
    loadProductOptions(),
  ]);

  const groupById = new Map(groups.map((group) => [group.id, group]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const assignmentsByOption = new Map<string, string[]>();

  productOptions.forEach((assignment) => {
    const current = assignmentsByOption.get(assignment.option_id) ?? [];
    current.push(assignment.product_id);
    assignmentsByOption.set(assignment.option_id, current);
  });

  return options.map((option) => {
    const group = groupById.get(option.group_id);
    const label = getLocalizedFields(option, "label");
    const groupName = group
      ? resolveLocalizedText(getLocalizedFields(group, "name"), locale)
      : option.group_id;
    const productIds = assignmentsByOption.get(option.id) ?? [];
    const categoryCount = new Set(
      productIds
        .map((productId) => productById.get(productId)?.category_id)
        .filter(Boolean)
    ).size;

    return {
      categoryCount,
      displayLabel: resolveLocalizedText(label, locale),
      groupId: option.group_id,
      groupKey: group?.key ?? option.group_id,
      groupName,
      id: option.id,
      isActive: option.is_active,
      isRequired: option.is_required,
      key: option.key,
      label,
      productCount: productIds.length,
      sortOrder: option.sort_order,
      type: option.type,
      values: Array.isArray(option.values_json)
        ? option.values_json
            .filter(
              (
                value
              ): value is { label: string; value: string } =>
                typeof value === "object" &&
                value !== null &&
                "label" in value &&
                "value" in value &&
                typeof value.label === "string" &&
                typeof value.value === "string"
            )
            .map((value) => ({
              label: value.label,
              value: value.value,
            }))
        : [],
    };
  });
}

export async function getOptionGroups(
  locale: AppLocale = "de"
): Promise<AdminOptionGroupRecord[]> {
  const [groups, options] = await Promise.all([loadOptionGroupRows(), loadOptionRows()]);
  const counts = new Map<string, number>();

  options.forEach((option) => {
    counts.set(option.group_id, (counts.get(option.group_id) ?? 0) + 1);
  });

  return groups.map((group) => {
    const name = getLocalizedFields(group, "name");

    return {
      displayName: resolveLocalizedText(name, locale),
      id: group.id,
      isActive: group.is_active,
      key: group.key,
      name,
      optionCount: counts.get(group.id) ?? 0,
      sortOrder: group.sort_order,
    };
  });
}

export async function createCategory(input: CategoryInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = categoryInputSchema.parse(input);
  const { data, error } = await supabase
    .from("categories")
    .insert(toCategoryInsert(parsed) as TableInsert<"categories">)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create category: ${error.message}`);
  }

  return data;
}

export async function updateCategory(input: CategoryUpdateInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = categoryUpdateSchema.parse(input);
  const { data, error } = await supabase
    .from("categories")
    .update(toCategoryInsert(parsed) as TableUpdate<"categories">)
    .eq("id", parsed.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update category: ${error.message}`);
  }

  return data;
}

export async function setCategoryActive(categoryId: string, isActive: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", categoryId)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to update category status: ${error.message}`);
  }

  return data;
}

export async function deleteCategory(categoryId: string) {
  return setCategoryActive(categoryId, false);
}

async function replaceProductImages(
  productId: string,
  gallery: string[],
  fallbackAltText: string
) {
  const supabase = await createSupabaseServerClient();
  const normalizedGallery = [...new Set(gallery.map((image) => image.trim()).filter(Boolean))];

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (deleteError) {
    throw new Error(`Unable to replace product images: ${deleteError.message}`);
  }

  if (normalizedGallery.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("product_images").insert(
    normalizedGallery.map((imageUrl, index) => ({
      alt_text: fallbackAltText,
      image_url: imageUrl,
      product_id: productId,
      sort_order: index + 1,
    }))
  );

  if (insertError) {
    throw new Error(`Unable to save product gallery: ${insertError.message}`);
  }
}

export async function assignProductOptions(
  productId: string,
  optionIds: string[]
) {
  const supabase = await createSupabaseServerClient();
  const uniqueOptionIds = [...new Set(optionIds)];
  const { error: deleteError } = await supabase
    .from("product_options")
    .delete()
    .eq("product_id", productId);

  if (deleteError) {
    throw new Error(`Unable to update product options: ${deleteError.message}`);
  }

  if (uniqueOptionIds.length === 0) {
    return;
  }

  const { data: options, error: optionsError } = await supabase
    .from("options")
    .select("id, is_required")
    .in("id", uniqueOptionIds);

  if (optionsError) {
    throw new Error(`Unable to load option defaults: ${optionsError.message}`);
  }

  const requiredById = new Map(
    options.map((option) => [option.id, option.is_required])
  );

  const { error: insertError } = await supabase.from("product_options").insert(
    uniqueOptionIds.map((optionId) => ({
      is_required: requiredById.get(optionId) ?? false,
      option_id: optionId,
      product_id: productId,
    }))
  );

  if (insertError) {
    throw new Error(`Unable to save product options: ${insertError.message}`);
  }
}

export async function createProduct(input: ProductInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = productInputSchema.parse(input);
  const payload = toProductInsert(parsed) as TableInsert<"products">;
  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create product: ${error.message}`);
  }

  await replaceProductImages(data.id, parsed.gallery, parsed.name.de);
  await assignProductOptions(data.id, parsed.optionIds);

  return data;
}

export async function updateProduct(input: ProductUpdateInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = productUpdateSchema.parse(input);
  const { data, error } = await supabase
    .from("products")
    .update(toProductInsert(parsed) as TableUpdate<"products">)
    .eq("id", parsed.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update product: ${error.message}`);
  }

  await replaceProductImages(parsed.id, parsed.gallery, parsed.name.de);
  await assignProductOptions(parsed.id, parsed.optionIds);

  return data;
}

export async function setProductActive(productId: string, isActive: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to update product status: ${error.message}`);
  }

  return data;
}

export async function setProductFeatured(productId: string, isFeatured: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update({ is_featured: isFeatured })
    .eq("id", productId)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to update product feature state: ${error.message}`);
  }

  return data;
}

export async function deleteProduct(productId: string) {
  return setProductActive(productId, false);
}

async function generateNextSku() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select("sku");

  if (error) {
    throw new Error(`Unable to generate next SKU: ${error.message}`);
  }

  const nextNumber =
    data.reduce((maxSku, product) => {
      const match = product.sku.match(/(\d+)$/);
      return Math.max(maxSku, match ? Number(match[1]) : 0);
    }, 0) + 1;

  return `GH-${String(nextNumber).padStart(4, "0")}`;
}

async function generateDuplicateSlug(baseSlug: string) {
  const supabase = await createSupabaseServerClient();
  let counter = 1;

  while (true) {
    const suffix = counter === 1 ? "copy" : `copy-${counter}`;
    const candidate = `${baseSlug}-${suffix}`;
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to generate duplicate slug: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }

    counter += 1;
  }
}

export async function duplicateProduct(productId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: product, error: productError }, { data: images, error: imagesError }, { data: options, error: optionsError }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", productId).single(),
      supabase
        .from("product_images")
        .select("image_url, sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true }),
      supabase.from("product_options").select("option_id").eq("product_id", productId),
    ]);

  if (productError) {
    throw new Error(`Unable to duplicate product: ${productError.message}`);
  }

  if (imagesError) {
    throw new Error(`Unable to copy product gallery: ${imagesError.message}`);
  }

  if (optionsError) {
    throw new Error(`Unable to copy product options: ${optionsError.message}`);
  }

  const duplicateInput: ProductInput = {
    categoryId: product.category_id,
    description: getLocalizedFields(product, "description"),
    gallery: images.map((image) => image.image_url),
    isActive: product.is_active,
    isFeatured: false,
    name: getLocalizedFields(product, "name"),
    optionIds: options.map((option) => option.option_id),
    sku: await generateNextSku(),
    slug: await generateDuplicateSlug(product.slug),
    sortOrder: product.sort_order + 1,
    tags: product.tags ?? [],
  };

  return createProduct(duplicateInput);
}

export async function createOptionGroup(input: OptionGroupInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = optionGroupInputSchema.parse(input);
  const { data, error } = await supabase
    .from("option_groups")
    .insert(toOptionGroupInsert(parsed))
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create option group: ${error.message}`);
  }

  return data;
}

export async function createOption(input: OptionInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = optionInputSchema.parse(input);
  const { data, error } = await supabase
    .from("options")
    .insert(toOptionInsert(parsed) as TableInsert<"options">)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create option: ${error.message}`);
  }

  return data;
}

export async function updateOption(input: OptionUpdateInput) {
  const supabase = await createSupabaseServerClient();
  const parsed = optionUpdateSchema.parse(input);
  const { data, error } = await supabase
    .from("options")
    .update(toOptionInsert(parsed))
    .eq("id", parsed.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to update option: ${error.message}`);
  }

  return data;
}

export async function setOptionActive(optionId: string, isActive: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("options")
    .update({ is_active: isActive })
    .eq("id", optionId)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to update option status: ${error.message}`);
  }

  return data;
}

export async function deleteOption(optionId: string) {
  return setOptionActive(optionId, false);
}
