import { useTranslations } from "next-intl";

import { BrandLoader } from "@/components/shared/BrandLoader";

export function PublicRouteSkeleton() {
  const t = useTranslations("Common");
  return <BrandLoader label={t("loading")} />;
}

export function AdminRouteSkeleton() {
  const t = useTranslations("Common");
  return <BrandLoader label={t("loading")} size="md" />;
}
