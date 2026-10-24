import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ProductGrid } from "@/components/shop/ProductGrid";
import { PageHeader } from "@/components/site/PageHeader";
import { getPublicCategories, getPublicProducts } from "@/lib/db/catalog";
import { getPublicVisualSettings } from "@/lib/db/siteSettings";
import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string | string[]; product?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "shop");
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ShopPage({ params, searchParams }: PageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Shop.hero" });
  const { category, product } = await searchParams;
  const [categories, products, visualSettings] = await Promise.all([
    getPublicCategories(locale),
    getPublicProducts(locale),
    getPublicVisualSettings(),
  ]);

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} imageUrl={visualSettings.shopHeroImageUrl} />
      <ProductGrid
        categories={categories}
        initialCategory={first(category)}
        initialProduct={first(product)}
        products={products}
      />
    </>
  );
}
