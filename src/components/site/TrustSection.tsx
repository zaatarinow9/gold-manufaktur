import { useTranslations } from "next-intl";

type TrustItem = { description: string; title: string };

/** The four promises of the house, as one quiet band under the hero. */
export function TrustSection() {
  const t = useTranslations("Home.trust");
  const items = t.raw("items") as TrustItem[];

  return (
    <section className="border-b border-[var(--border)] bg-surface" aria-labelledby="home-trust-title">
      <div className="container-shell">
        <div className="content-shell grid gap-12 py-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:py-16">
          <div>
            <h2 id="home-trust-title" className="section-heading text-foreground">
              {t("title")}
            </h2>
            <p className="mt-4 max-w-md text-[0.9375rem] leading-7 text-muted">{t("description")}</p>
          </div>

          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item.title} className="border-t border-[var(--border-strong)] pt-4">
                <dt className="font-semibold text-foreground">{item.title}</dt>
                <dd className="mt-1.5 text-[0.9375rem] leading-7 text-muted">{item.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
