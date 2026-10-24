import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getPublicProducts } from "@/lib/db/catalog";
import { validateOrderEntryToken } from "@/lib/db/siteSettings";
import { resolveLocale } from "@/lib/site";

import { OrderEntryClient } from "./order-entry-client";

type OrderEntryPageProps = {
  params: Promise<{ locale: string; token: string }>;
};

export default async function OrderEntryPage({
  params,
}: OrderEntryPageProps) {
  const { token, locale: localeParam } = await params;
  const locale = await resolveLocale(Promise.resolve({ locale: localeParam }));
  const isValid = await validateOrderEntryToken(token);

  if (!isValid) {
    notFound();
  }

  const products = await getPublicProducts(locale);

  if (products.length === 0) {
    const t = await getTranslations({ locale, namespace: "OrderEntry" });

    return (
      <div className="container-shell">
        <div className="content-shell py-20 text-center">
          <h1 className="section-heading text-foreground">{t("unavailableTitle")}</h1>
          <p className="section-copy mx-auto mt-4 max-w-lg">{t("unavailableDescription")}</p>
        </div>
      </div>
    );
  }

  return <OrderEntryClient locale={locale} products={products} token={token} />;
}
