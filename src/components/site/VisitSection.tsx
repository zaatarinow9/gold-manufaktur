import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { ContactForm } from "@/components/site/ContactForm";
import { PhoneInline } from "@/components/site/PhoneInline";
import { companyDirectionsUrl, companyInfo, companyMapEmbedUrl } from "@/lib/site";
import type { CatalogProduct } from "@/types/catalog";

type VisitSectionProps = {
  /** Hide the section title when the page already has one (contact page). */
  hideHeading?: boolean;
  product?: CatalogProduct | null;
};

/** Address, direct contact and the map next to the inquiry form. */
export function VisitSection({ hideHeading = false, product }: VisitSectionProps) {
  const t = useTranslations("Home.visit");
  const location = useTranslations("Contact.location");

  const contactLines = [
    { href: companyInfo.phoneHref, icon: Phone, label: location("phoneLabel"), value: <PhoneInline>{companyInfo.phoneDisplay}</PhoneInline> },
    { href: companyInfo.whatsappHref, icon: MessageCircle, label: location("whatsappCta"), value: <PhoneInline>{companyInfo.phoneDisplay}</PhoneInline>, external: true },
    { href: companyInfo.emailHref, icon: Mail, label: location("emailLabel"), value: <bdi>{companyInfo.emailDisplay}</bdi> },
  ];

  return (
    <section id="kontakt" className={hideHeading ? "scroll-mt-20 pb-20 pt-10 sm:pt-12" : "section-shell scroll-mt-20"} aria-labelledby={hideHeading ? undefined : "visit-title"}>
      <div className="container-shell">
        <div className="content-shell">
          {hideHeading ? null : (
            <div className="max-w-2xl">
              <h2 id="visit-title" className="section-heading text-foreground">
                {t("title")}
              </h2>
              <p className="section-copy mt-3">{t("description")}</p>
            </div>
          )}

          <div className={hideHeading ? "grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14" : "mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14"}>
            <div className={hideHeading ? "order-2 flex flex-col gap-8" : "flex flex-col gap-8"}>
              <div>
                <p className="flex items-start gap-3 text-foreground">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-gold" />
                  <span>
                    <span className="block font-medium">{companyInfo.name}</span>
                    <span className="block text-muted">{companyInfo.address}</span>
                  </span>
                </p>
                <a href={companyDirectionsUrl} target="_blank" rel="noreferrer" className="text-link mt-3 ms-7">
                  {location("routeCta")}
                </a>
              </div>

              <ul className="border-t border-[var(--border)]">
                {contactLines.map((line) => (
                  <li key={line.label} className="border-b border-[var(--border)]">
                    <a
                      href={line.href}
                      {...(line.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="group flex items-center gap-3 py-3.5"
                    >
                      <line.icon className="h-4 w-4 shrink-0 text-gold" />
                      <span className="w-24 shrink-0 text-sm text-text-soft">{line.label}</span>
                      <span className="min-w-0 truncate text-foreground transition group-hover:text-gold-soft">{line.value}</span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="media-frame relative aspect-[4/3] border border-[var(--border)]">
                <iframe
                  title={location("mapTitle")}
                  src={companyMapEmbedUrl}
                  className="absolute inset-0 h-full w-full border-0 [filter:grayscale(0.6)_contrast(1.05)]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            <ContactForm product={product} />
          </div>
        </div>
      </div>
    </section>
  );
}
