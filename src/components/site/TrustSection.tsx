import { useTranslations } from "next-intl";

type TrustItem = { description: string; title: string };
type HallmarkItem = { label: string; stamp: string };

/** Purity hallmarks plus the four service promises, as one quiet band. */
export function TrustSection() {
  const t = useTranslations("Home");
  const hallmarks = t.raw("hallmarks.items") as HallmarkItem[];
  const items = t.raw("trust.items") as TrustItem[];

  return (
    <section className="border-b border-[var(--border)] bg-surface">
      <div className="container-shell">
        <div className="content-shell grid gap-12 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-16">
          <div>
            <h2 className="section-heading text-foreground !text-[clamp(1.75rem,3vw,2.5rem)]">{t("hallmarks.title")}</h2>
            <p className="mt-4 max-w-md text-[0.9375rem] leading-7 text-muted">{t("hallmarks.description")}</p>
            <ul className="mt-7 flex flex-wrap gap-3">
              {hallmarks.map((item) => (
                <li key={item.stamp} className="hallmark" aria-label={`${item.stamp} – ${item.label}`}>
                  <span className="hallmark-number" aria-hidden="true">{item.stamp}</span>
                  <span className="hallmark-karat" aria-hidden="true">{item.label}</span>
                </li>
              ))}
            </ul>
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
