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
    return (
      <div className="container-shell py-16">
        <div className="content-shell rounded-[32px] border border-white/10 bg-black/30 px-6 py-10 text-center sm:px-8">
          <p className="text-sm uppercase tracking-[0.24em] text-gold-soft">
            GoldHelwah
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-foreground">
            Auftragserfassung derzeit nicht verfuegbar
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Es sind aktuell keine aktiven Produkte fuer diesen Link hinterlegt.
          </p>
        </div>
      </div>
    );
  }

  return <OrderEntryClient locale={locale} products={products} token={token} />;
}
