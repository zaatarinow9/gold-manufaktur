import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { PhoneInline } from "@/components/site/PhoneInline";
import { SocialIcon } from "@/components/site/SocialIcon";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { companyInfo, getBrandLogoAlt, legalNavigation, siteNavigation, siteName } from "@/lib/site";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav.links");
  const locale = useLocale() as AppLocale;
  const year = new Date().getFullYear();
  const socialLinks = [
    { href: companyInfo.instagramHref, platform: "instagram", label: t("socials.instagram") },
    { href: companyInfo.facebookHref, platform: "facebook", label: t("socials.facebook") },
    { href: companyInfo.tiktokHref, platform: "tiktok", label: t("socials.tiktok") },
    { href: companyInfo.snapchatHref, platform: "snapchat", label: t("socials.snapchat") },
  ] as const;

  return (
    <footer className="border-t border-[var(--border)] bg-[#0b0805]">
      <div className="container-shell">
        <div className="content-shell py-14 sm:py-16">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.9fr] lg:gap-12">
            <div className="col-span-2 max-w-sm lg:col-span-1">
              <Link href="/" className="brand-logo-link">
                <span className="sr-only">{siteName}</span>
                <BrandLogo alt={getBrandLogoAlt(locale)} className="h-16 w-auto" />
              </Link>
              <p className="mt-5 text-[0.9375rem] leading-7 text-muted">{t("description")}</p>

              <ul className="mt-6 space-y-3 text-[0.9375rem] text-muted">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-gold-soft" />
                  <span dir="ltr">{companyInfo.address}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-gold-soft" />
                  <a href={companyInfo.phoneHref} className="transition-colors hover:text-foreground">
                    <PhoneInline>{companyInfo.phoneDisplay}</PhoneInline>
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="mt-1 h-4 w-4 shrink-0 text-gold-soft" />
                  <a href={companyInfo.emailHref} dir="ltr" className="transition-colors hover:text-foreground">
                    {companyInfo.emailDisplay}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">{t("navigationTitle")}</p>
              <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-muted">
                {siteNavigation.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {nav(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">{t("legalTitle")}</p>
              <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-muted">
                {legalNavigation.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {nav(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">{t("socialTitle")}</p>
              <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-muted">
                {socialLinks.map((item) => (
                  <li key={item.platform}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 transition-colors hover:text-foreground"
                    >
                      <SocialIcon platform={item.platform} className="h-4 w-4 shrink-0 text-gold-soft" />
                      {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href={companyInfo.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 transition-colors hover:text-foreground"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-gold-soft" />
                    {t("socials.whatsapp")}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-[var(--border)] pt-6 text-sm text-text-soft sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} {companyInfo.name}
            </p>
            <p>{t("legalNote")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
