import type { Metadata } from "next";

import { HomeContent } from "@/components/site/HomeContent";
import { PromoPopup } from "@/components/site/PromoPopup";
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
  return (
    <>
      <PromoPopup promo={visualSettings.promoPopup} />
      <HomeContent
        categories={homepageCatalog.categories}
        featuredProducts={homepageCatalog.featuredProducts}
        latestProducts={homepageCatalog.latestProducts}
        heroImageUrl={visualSettings.homepageHeroImageUrl}
      />
    </>
  );
}
