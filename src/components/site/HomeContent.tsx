import { AboutSection } from "@/components/site/AboutSection";
import { CustomNameFeature } from "@/components/site/CustomNameFeature";
import { FeaturedCategories } from "@/components/site/FeaturedCategories";
import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { HeroSection } from "@/components/site/HeroSection";
import { TrustSection } from "@/components/site/TrustSection";
import { VisitSection } from "@/components/site/VisitSection";
import { pickVisualProducts } from "@/lib/catalog/publicVisuals";
import type { CatalogCategory, CatalogProduct } from "@/types/catalog";

type HomeContentProps = {
  categories: CatalogCategory[];
  featuredProducts: CatalogProduct[];
  heroImageUrl?: string;
  latestProducts: CatalogProduct[];
};

const customNameCategorySlug = "namensschmuck-nach-mass";

/** The home page sections, shared by the route and local previews. */
export function HomeContent({ categories, featuredProducts, heroImageUrl, latestProducts }: HomeContentProps) {
  const visualProducts = pickVisualProducts([...featuredProducts, ...latestProducts], 3);

  // Featured first, then the newest pieces, each piece once.
  const seen = new Set<string>();
  const showcase = [...featuredProducts, ...latestProducts].filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });

  const customNameCategory = categories.find((category) => category.slug === customNameCategorySlug);
  const customNameImage =
    showcase.find((product) => product.categorySlug === customNameCategorySlug)?.imageUrl ||
    customNameCategory?.imageUrl ||
    visualProducts[1]?.imageUrl;

  return (
    <>
      <HeroSection imageUrl={heroImageUrl} visualProduct={visualProducts[0] ?? null} />
      <TrustSection />
      <FeaturedCategories categories={categories} />
      <FeaturedProducts products={showcase} />
      <CustomNameFeature categorySlug={customNameCategory?.slug} imageUrl={customNameImage} />
      <AboutSection />
      <VisitSection />
    </>
  );
}
