import type { Metadata } from "next";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ShopHero } from "@/components/shop/ShopHero";
import { pickVisualProducts } from "@/lib/catalog/publicVisuals";
import { getPublicCategories, getPublicProducts } from "@/lib/db/catalog";
import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "shop");
}

export default async function ShopPage({
  params,
  searchParams,
}: PageProps) {
  const locale = await resolveLocale(params);
  const { category } = await searchParams;
  const [categories, products] = await Promise.all([
    getPublicCategories(locale),
    getPublicProducts(locale),
  ]);
  const visualProducts = pickVisualProducts(products, 3);
  const initialCategory = Array.isArray(category) ? category[0] : category;

  return (
    <div className="space-y-4 pb-8 sm:space-y-6">
      <ShopHero
        backgroundProduct={visualProducts[0] ?? null}
        primaryProduct={visualProducts[1] ?? visualProducts[0] ?? null}
        secondaryProduct={visualProducts[2] ?? visualProducts[1] ?? null}
      />
      <ProductGrid
        categories={categories}
        initialCategory={initialCategory}
        products={products}
      />
    </div>
  );
}
