import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ContactCards } from "@/components/site/ContactCards";
import { ContactForm } from "@/components/site/ContactForm";
import { LocationMap } from "@/components/site/LocationMap";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import { Link } from "@/i18n/navigation";
import { pickVisualProducts } from "@/lib/catalog/publicVisuals";
import {
  getFeaturedProducts,
  getLatestProducts,
  getPublicProductByIdOrSlug,
} from "@/lib/db/catalog";
import { trimDisplayHeading } from "@/lib/displayText";
import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "contact");
}

export default async function ContactPage({
  params,
  searchParams,
}: PageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Contact.hero" });
  const { product } = await searchParams;
  const [featuredProducts, latestProducts] = await Promise.all([
    getFeaturedProducts(locale, 1),
    getLatestProducts(locale, 1),
  ]);
  const selectedProduct = product
    ? await getPublicProductByIdOrSlug(locale, product)
    : null;
  const visualProduct = pickVisualProducts(
    [...featuredProducts, ...latestProducts],
    1
  )[0] ?? null;

  return (
    <div className="space-y-2 pb-8">
      <section className="py-8 sm:py-10">
        <div className="container-shell">
          <div className="content-shell rtl-mirror-grid grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="contact-hero-copy rtl-items-start luxury-panel px-6 py-8 sm:px-8 sm:py-10">
              <span className="eyebrow">{t("eyebrow")}</span>
              <h1 className="section-title mt-6 text-foreground">
                {trimDisplayHeading(t("title"))}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                {t("subtitle")}
              </p>

              <div className="rtl-inline-row rtl-justify-start mt-8 flex flex-wrap gap-3">
                <Link href="/shop" className="gold-button">
                  {t("primaryCta")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/datenschutz" className="ghost-button">
                  {t("secondaryCta")}
                </Link>
              </div>
            </div>

            <div className="relative min-h-[22rem] overflow-hidden rounded-[32px] border border-white/10 bg-black/30">
              <LuxuryMedia
                src={visualProduct?.imageUrl}
                alt={visualProduct?.name || t("title")}
                sizes="(max-width: 1279px) 100vw, 54vw"
                fallbackContent={
                  <div className="absolute inset-x-5 bottom-5">
                    <span className="gold-chip">
                      {visualProduct?.categoryName || "GoldHelwah GmbH"}
                    </span>
                  </div>
                }
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.78))]" />
            </div>
          </div>
        </div>
      </section>

      <ContactCards />
      <ContactForm product={selectedProduct} />
      <LocationMap />
    </div>
  );
}
