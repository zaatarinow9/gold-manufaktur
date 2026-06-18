import {
  Camera,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { PhoneInline } from "@/components/site/PhoneInline";
import { Link } from "@/i18n/navigation";
import { companyInfo, getBrandLogoAlt, siteNavigation, siteName } from "@/lib/site";
import type { AppLocale } from "@/i18n/routing";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav.links");
  const locale = useLocale() as AppLocale;
  const year = new Date().getFullYear();
  const brandLogoAlt = getBrandLogoAlt(locale);
  const socialLinks = [
    {
      href: companyInfo.instagramHref,
      icon: Camera,
      label: t("socials.instagram"),
    },
    {
      href: companyInfo.facebookHref,
      icon: Share2,
      label: t("socials.facebook"),
    },
    {
      href: companyInfo.tiktokHref,
      icon: Music2,
      label: t("socials.tiktok"),
    },
    {
      href: companyInfo.whatsappHref,
      icon: MessageCircle,
      label: t("socials.whatsapp"),
    },
  ] as const;

  return (
    <footer className="mt-24 border-t border-white/8 bg-[linear-gradient(180deg,rgba(6,6,6,0.92),rgba(5,5,5,0.98))]">
      <div className="container-shell">
        <div className="content-shell py-12 sm:py-14">
          <div className="site-footer-grid rtl-mirror-grid grid gap-10 xl:grid-cols-[1.2fr_0.8fr_0.9fr_0.9fr]">
            <div className="space-y-4">
              <Link href="/" className="brand-logo-link">
                <span className="sr-only">{siteName}</span>
                <BrandLogo
                  alt={brandLogoAlt}
                  className="h-[3.75rem] w-auto shrink-0 sm:h-[4.3rem]"
                />
              </Link>
              <p className="max-w-xs text-sm leading-6 text-muted">
                {t("description")}
              </p>
            </div>

            <div>
              <p className="muted-label">{t("navigationTitle")}</p>
              <div className="mt-5 flex flex-col gap-3 text-sm text-muted">
                {siteNavigation.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="transition hover:text-foreground"
                  >
                    {nav(link.key)}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="muted-label">{t("contactTitle")}</p>
              <div className="mt-5 space-y-4 text-sm text-muted">
                <div className="rtl-inline-row flex items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 text-gold-soft" />
                  <p className="leading-6">{companyInfo.address}</p>
                </div>
                <div className="rtl-inline-row flex items-start gap-3">
                  <Phone className="mt-1 h-4 w-4 text-gold-soft" />
                  <a
                    href={companyInfo.phoneHref}
                    className="leading-6 transition hover:text-foreground"
                  >
                    <PhoneInline>{companyInfo.phoneDisplay}</PhoneInline>
                  </a>
                </div>
                <div className="rtl-inline-row flex items-start gap-3">
                  <Mail className="mt-1 h-4 w-4 text-gold-soft" />
                  <a
                    href={companyInfo.emailHref}
                    className="leading-6 transition hover:text-foreground"
                  >
                    {companyInfo.emailDisplay}
                  </a>
                </div>
              </div>
            </div>

            <div>
              <p className="muted-label">{t("socialTitle")}</p>
              <div className="mt-5 space-y-3 text-sm text-muted">
                {socialLinks.map((item) => {
                  const Icon = item.icon;
                  const isWhatsApp = item.href === companyInfo.whatsappHref;

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`footer-social-link rtl-inline-row flex items-center gap-3 rounded-full px-4 py-3 transition ${
                        isWhatsApp
                          ? "border border-gold/20 bg-gold/10 text-foreground hover:border-gold/40 hover:text-gold-soft"
                          : "border border-white/10 bg-white/4 text-muted hover:border-gold/25 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 text-gold-soft" />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="site-footer-bottom mt-10 flex flex-col gap-3 border-t border-white/8 pt-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>{`(c) ${year} ${companyInfo.name}`}</p>
            <p>{t("legalNote")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
