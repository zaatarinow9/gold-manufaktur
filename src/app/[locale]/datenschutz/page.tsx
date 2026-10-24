import type { Metadata } from "next";
import { useTranslations } from "next-intl";

import { LegalArticle } from "@/components/site/LegalArticle";
import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type PrivacySection = {
  paragraphs: string[];
  title: string;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "privacy");
}

export default function PrivacyPage() {
  const t = useTranslations("Privacy");

  return (
    <LegalArticle
      title={t("title")}
      description={t("description")}
      intro={t("intro")}
      sections={t.raw("sections") as PrivacySection[]}
      notes={[{ text: t("noticeText"), title: t("noticeTitle") }]}
    />
  );
}
