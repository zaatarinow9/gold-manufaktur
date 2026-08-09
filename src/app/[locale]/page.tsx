import type { Metadata } from "next";

import { AboutCompanySection } from "@/components/site/AboutCompanySection";
import { AboutGoldSection } from "@/components/site/AboutGoldSection";
import { CallToAction } from "@/components/site/CallToAction";
import { CollectionShowcase } from "@/components/site/CollectionShowcase";
import { ContactForm } from "@/components/site/ContactForm";
import { FeaturedCategories } from "@/components/site/FeaturedCategories";
import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { HeroSection } from "@/components/site/HeroSection";
import { LocationMap } from "@/components/site/LocationMap";
import { TrustSection } from "@/components/site/TrustSection";
import { PromoPopup } from "@/components/site/PromoPopup";
import { pickVisualProducts } from "@/lib/catalog/publicVisuals";
import { getHomepageCatalog } from "@/lib/db/catalog";
import { getPublicVisualSettings } from "@/lib/db/siteSettings";
import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "home");
}

export default async function LocaleHomePage({
  params,
}: PageProps) {
  const locale = await resolveLocale(params);
  const [homepageCatalog, visualSettings] = await Promise.all([getHomepageCatalog(locale), getPublicVisualSettings()]);
  const visualProducts = pickVisualProducts(
    [...homepageCatalog.featuredProducts, ...homepageCatalog.latestProducts],
    3
  );

  return (
    <>
      <PromoPopup promo={visualSettings.promoPopup} />
      <HeroSection imageUrl={visualSettings.homepageHeroImageUrl} visualProduct={visualProducts[0] ?? null} />
      <TrustSection />
      <FeaturedCategories categories={homepageCatalog.categories} />
      <FeaturedProducts products={homepageCatalog.featuredProducts} />
      <CollectionShowcase products={homepageCatalog.latestProducts} />
      <AboutGoldSection visualProduct={visualProducts[1] ?? visualProducts[0] ?? null} />
      <AboutCompanySection />
      <ContactForm />
      <LocationMap />
      <CallToAction visualProduct={visualProducts[2] ?? visualProducts[0] ?? null} />
    </>
  );
}
