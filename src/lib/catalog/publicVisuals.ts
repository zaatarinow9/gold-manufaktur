import type { CatalogCategory, CatalogProduct } from "@/types/catalog";

function hasImage(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function pickVisualProducts(
  products: CatalogProduct[],
  count: number
): CatalogProduct[] {
  const seenImages = new Set<string>();

  return products.filter((product) => {
    if (!hasImage(product.imageUrl)) {
      return false;
    }

    if (seenImages.has(product.imageUrl)) {
      return false;
    }

    seenImages.add(product.imageUrl);
    return true;
  }).slice(0, count);
}

export function getPrimaryCategoryImage(
  categories: CatalogCategory[]
): string {
  return categories.find((category) => hasImage(category.imageUrl))?.imageUrl ?? "";
}
