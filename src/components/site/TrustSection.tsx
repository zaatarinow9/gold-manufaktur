import { Gem, Image, MapPin, MessagesSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import { SectionHeading } from "./SectionHeading";

type TrustItem = {
  description: string;
  title: string;
};

export function TrustSection() {
  const t = useTranslations("Home.trust");
  const items = t.raw("items") as TrustItem[];
  const icons = [MessagesSquare, Image, Gem, MapPin];

  return (
    <section className="section-shell">
      <div className="container-shell">
        <div className="content-shell">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            align="center"
            className="max-w-[54rem]"
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item, index) => {
              const Icon = icons[index % icons.length];

              return (
                <article
                  key={item.title}
                  className="luxury-panel px-6 py-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/28 bg-gold/10 text-gold-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
