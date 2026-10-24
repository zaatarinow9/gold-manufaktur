import type { Metadata } from "next";
import { useTranslations } from "next-intl";

import { LegalArticle } from "@/components/site/LegalArticle";
import { createPageMetadata } from "@/lib/metadata";
import { resolveLocale } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type LegalSection = {
  lines: string | string[];
  title: string;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return createPageMetadata(await resolveLocale(params), "impressum");
}

export default function ImpressumPage() {
  const t = useTranslations("Impressum");
  const sections = (t.raw("sections") as LegalSection[]).map((section) => ({
    paragraphs: Array.isArray(section.lines) ? section.lines : [section.lines],
    title: section.title,
  }));

  return (
    <LegalArticle
      title={t("title")}
      description={t("description")}
      intro={t("complianceNoticeDescription")}
      sections={[...sections, { paragraphs: [t("disclaimerText")], title: t("disclaimerTitle") }]}
    />
  );
}
