import type { Metadata } from "next";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ShopHero } from "@/components/shop/ShopHero";
import { catalogCategories, catalogProducts } from "@/data/catalog";
import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "shop");
}

export default function ShopPage() {
  return (
    <div className="space-y-4 pb-8 sm:space-y-6">
      <ShopHero />
      <ProductGrid categories={catalogCategories} products={catalogProducts} />
    </div>
  );
}
