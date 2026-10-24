import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/site/PageHeader";
import { VisitSection } from "@/components/site/VisitSection";
import { getPublicProductByIdOrSlug } from "@/lib/db/catalog";
import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "contact");
}

export default async function ContactPage({ params, searchParams }: PageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Contact.hero" });
  const { product } = await searchParams;
  const selectedProduct = product ? await getPublicProductByIdOrSlug(locale, product) : null;

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <VisitSection hideHeading product={selectedProduct} />
    </>
  );
}
