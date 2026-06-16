import { MessageCircle, Phone, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { companyInfo } from "@/lib/site";

export function ContactCards() {
  const t = useTranslations("Contact.cards");

  const items = [
    {
      actionHref: undefined,
      actionLabel: undefined,
      description: t("consultationText"),
      icon: Sparkles,
      title: t("consultationTitle"),
      value: t("consultationValue"),
    },
    {
      actionHref: companyInfo.phoneHref,
      actionLabel: t("phoneCta"),
      description: t("phoneText"),
      icon: Phone,
      title: t("phoneTitle"),
      value: companyInfo.phoneDisplay,
    },
    {
      actionHref: companyInfo.whatsappHref,
      actionLabel: t("whatsappCta"),
      description: t("whatsappText"),
      icon: MessageCircle,
      title: t("whatsappTitle"),
      value: "WhatsApp",
    },
  ] as const;

  return (
    <section className="py-6 sm:py-8">
      <div className="container-shell">
        <div className="content-shell">
          <div className="grid gap-4 md:grid-cols-3">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="luxury-panel px-6 py-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="muted-label mt-5">{item.title}</p>
                  <p className="mt-3 text-2xl font-medium text-foreground">
                    {item.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {item.description}
                  </p>
                  {item.actionHref && item.actionLabel ? (
                    <a
                      href={item.actionHref}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold-soft transition hover:text-foreground"
                      rel="noreferrer"
                      target={item.actionHref.startsWith("http") ? "_blank" : undefined}
                    >
                      {item.actionLabel}
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
