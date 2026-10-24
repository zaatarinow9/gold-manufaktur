import { useTranslations } from "next-intl";

/** One short story about the house: what gold means to us, and who we are. */
export function AboutSection() {
  const gold = useTranslations("Home.aboutGold");
  const company = useTranslations("Home.aboutCompany");
  const points = gold.raw("points") as string[];

  return (
    <section className="section-shell border-y border-[var(--border)] bg-surface" aria-labelledby="home-about-title">
      <div className="container-shell">
        <div className="content-shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <h2 id="home-about-title" className="section-title text-foreground">
              {gold("title")}
            </h2>
            <p className="section-copy mt-5 max-w-lg text-[1.0625rem]">{gold("description")}</p>
          </div>

          <div className="lg:pt-3">
            <h3 className="font-semibold text-foreground">{company("title")}</h3>
            <p className="section-copy mt-3">{company("description")}</p>
            <p className="section-copy mt-4">{company("story")}</p>
            <ul className="mt-8 grid gap-0 border-t border-[var(--border)] sm:grid-cols-3">
              {points.map((point) => (
                <li
                  key={point}
                  className="border-b border-[var(--border)] py-4 font-medium text-gold-soft sm:border-b-0 sm:py-5 sm:pe-4"
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
