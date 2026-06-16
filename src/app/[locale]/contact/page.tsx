import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { ContactCards } from "@/components/site/ContactCards";
import { ContactForm } from "@/components/site/ContactForm";
import { LocationMap } from "@/components/site/LocationMap";
import { realProductImages } from "@/data/catalog";
import { Link } from "@/i18n/navigation";
import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "contact");
}

export default function ContactPage() {
  const t = useTranslations("Contact.hero");
  const visualImage = realProductImages[5];

  return (
    <div className="space-y-2 pb-8">
      <section className="py-8 sm:py-10">
        <div className="container-shell">
          <div className="content-shell rtl-mirror-grid grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="contact-hero-copy rtl-items-start luxury-panel px-6 py-8 sm:px-8 sm:py-10">
              <span className="eyebrow">{t("eyebrow")}</span>
              <h1 className="section-title mt-6 text-foreground">{t("title")}</h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                {t("subtitle")}
              </p>

              <div className="rtl-justify-start mt-8 flex flex-wrap gap-3">
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
              <Image
                src={visualImage.src}
                alt={visualImage.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1279px) 100vw, 54vw"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.78))]" />
            </div>
          </div>
        </div>
      </section>

      <ContactCards />
      <ContactForm />
      <LocationMap />
    </div>
  );
}
