import "server-only";

import type { CatalogCategory, CatalogProduct } from "@/data/catalog";
import type { AppLocale } from "@/i18n/routing";

import { resolveSupportsNameCustomization } from "@/lib/catalog/nameCustomization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/types";

function logDbReadError(scope: string, message: string) {
  console.error(`[catalog] ${scope}: ${message}`);
}

function getLocalizedValue<
  Prefix extends "description" | "name",
  Row extends Record<`${Prefix}_${AppLocale}`, string | null>,
>(row: Row, prefix: Prefix, locale: AppLocale) {
  const requested = row[`${prefix}_${locale}`];

  if (requested && requested.trim().length > 0) {
    return requested;
  }

  return row[`${prefix}_de`] ?? "";
}

function getCatalogImage(
  product: TableRow<"products">,
  gallery: string[]
) {
  if (product.cover_image_url) {
    return product.cover_image_url;
  }

  return gallery[0] ?? "";
}

export async function getPublicCategories(
  locale: AppLocale
): Promise<CatalogCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    logDbReadError("categories", error.message);
    return [];
  }

  return data.map((category) => ({
    accent: category.accent ?? "",
    id: category.id,
    imageUrl: category.image_url ?? "",
    name: getLocalizedValue(category, "name", locale),
    shortDescription: getLocalizedValue(category, "description", locale),
    slug: category.slug,
  }));
}

export async function getPublicProducts(
  locale: AppLocale
): Promise<CatalogProduct[]> {
  const supabase = await createSupabaseServerClient();
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (productsError) {
    logDbReadError("products", productsError.message);
    return [];
  }

  if (products.length === 0) {
    return [];
  }

  const categoryIds = [
    ...new Set(products.map((product) => product.category_id).filter(Boolean)),
  ] as string[];
  const productIds = products.map((product) => product.id);

  const [{ data: categories, error: categoriesError }, { data: images, error: imagesError }] =
    await Promise.all([
      categoryIds.length > 0
        ? supabase
            .from("categories")
            .select("id, slug, supports_name_customization")
            .eq("is_active", true)
            .in("id", categoryIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),
    ]);

  if (categoriesError) {
    logDbReadError("product categories", categoriesError.message);
    return [];
  }

  if (imagesError) {
    logDbReadError("product images", imagesError.message);
    return [];
  }

  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  );
  const imageMap = new Map<string, string[]>();

  images.forEach((image) => {
    const current = imageMap.get(image.product_id) ?? [];
    current.push(image.image_url);
    imageMap.set(image.product_id, current);
  });

  return products.map((product) => {
    const gallery = imageMap.get(product.id) ?? [];
    const category = product.category_id
      ? categoryById.get(product.category_id) ?? null
      : null;

    return {
      categorySlug: category?.slug ?? "all",
      gallery,
      id: product.id,
      imageUrl: getCatalogImage(product, gallery),
      isFeatured: product.is_featured,
      name: getLocalizedValue(product, "name", locale),
      shortDescription: getLocalizedValue(product, "description", locale),
      slug: product.slug,
      supportsNameCustomization: resolveSupportsNameCustomization(
        category?.supports_name_customization ?? false,
        product.supports_name_customization ?? null
      ),
      tags: product.tags ?? [],
    };
  });
}
