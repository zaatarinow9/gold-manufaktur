import { getTranslations } from "next-intl/server";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { TrackingLookupForm } from "@/components/site/TrackingLookupForm";
import { Link } from "@/i18n/navigation";
import { companyInfo, getBrandLogoAlt, resolveLocale, siteName } from "@/lib/site";

type TrackingLookupPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function TrackingLookupPage({
  params,
}: TrackingLookupPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Tracking" });
  const brandLogoAlt = getBrandLogoAlt(locale);

  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="content-shell">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="luxury-panel overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
              <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
                <div className="space-y-4">
                  <Link href="/" className="brand-logo-link">
                    <span className="sr-only">{siteName}</span>
                    <BrandLogo
                      alt={brandLogoAlt}
                      className="h-[3rem] w-auto shrink-0 sm:h-[3.35rem]"
                    />
                  </Link>
                  <div className="space-y-3">
                    <p className="eyebrow">{t("lookup.eyebrow")}</p>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      {t("lookup.title")}
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
                      {t("lookup.description")}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-gold/18 bg-gold/10 px-5 py-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-gold-soft">
                    {t("lookup.helperTitle")}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-foreground">
                    {t("lookup.helperDescription")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={companyInfo.phoneHref} className="ghost-button">
                      {t("phone")}
                    </a>
                    <Link href="/contact" className="gold-button">
                      {t("contactSupport")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="luxury-panel px-6 py-8 sm:px-8">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-foreground">{t("lookup.formTitle")}</h2>
                <p className="mt-1 text-sm text-muted">{t("lookup.formDescription")}</p>
              </div>
              <TrackingLookupForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
