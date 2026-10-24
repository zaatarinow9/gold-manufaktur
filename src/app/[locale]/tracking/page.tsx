import { MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/site/PageHeader";
import { TrackingLookupForm } from "@/components/site/TrackingLookupForm";
import { Link } from "@/i18n/navigation";
import { companyInfo, resolveLocale } from "@/lib/site";

type TrackingLookupPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function TrackingLookupPage({ params }: TrackingLookupPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Tracking" });

  return (
    <>
      <PageHeader title={t("lookup.title")} description={t("lookup.description")} />
      <div className="container-shell">
        <div className="content-shell grid gap-10 pb-20 pt-10 sm:pt-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-16">
          <div className="luxury-panel p-5 sm:p-8">
            <h2 className="font-semibold text-foreground">{t("lookup.formTitle")}</h2>
            <p className="mt-1 text-[0.9375rem] text-muted">{t("lookup.formDescription")}</p>
            <div className="mt-6">
              <TrackingLookupForm />
            </div>
          </div>

          <aside>
            <h2 className="font-semibold text-foreground">{t("lookup.helperTitle")}</h2>
            <p className="mt-2 leading-7 text-muted">{t("lookup.helperDescription")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={companyInfo.phoneHref} className="ghost-button">
                <Phone className="h-4 w-4" />
                {t("phone")}
              </a>
              <a href={companyInfo.whatsappHref} target="_blank" rel="noreferrer" className="ghost-button">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
            <Link href="/contact" className="text-link mt-5">
              {t("contactSupport")}
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
