import type { Metadata } from "next";
import { useTranslations } from "next-intl";

import { LegalArticle } from "@/components/site/LegalArticle";
import { getTranslations } from "next-intl/server";

import { resolveLocale } from "@/lib/site";

type PageProps = { params: Promise<{ locale: string }> };
type LegalSection = { title: string; text: string };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "AGB" });
  return { title: t("title"), description: t("description") };
}

export default function AgbPage() {
  const t = useTranslations("AGB");
  // Draft content – legal review recommended before final publication.
  const sections = (t.raw("sections") as LegalSection[]).map((section) => ({
    paragraphs: [section.text],
    title: section.title,
  }));

  return <LegalArticle title={t("title")} description={t("description")} sections={sections} />;
}
