import type { Metadata } from "next";

import { AboutCompanySection } from "@/components/site/AboutCompanySection";
import { AboutGoldSection } from "@/components/site/AboutGoldSection";
import { CallToAction } from "@/components/site/CallToAction";
import { ContactForm } from "@/components/site/ContactForm";
import { FeaturedCategories } from "@/components/site/FeaturedCategories";
import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { HeroSection } from "@/components/site/HeroSection";
import { LocationMap } from "@/components/site/LocationMap";
import { TrustSection } from "@/components/site/TrustSection";
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

export default function LocaleHomePage() {
  return (
    <>
      <HeroSection />
      <TrustSection />
      <FeaturedCategories />
      <FeaturedProducts />
      <AboutGoldSection />
      <AboutCompanySection />
      <ContactForm />
      <LocationMap />
      <CallToAction />
    </>
  );
}
