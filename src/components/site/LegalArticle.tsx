import { PageHeader } from "@/components/site/PageHeader";

type LegalArticleProps = {
  description?: string;
  intro?: string;
  notes?: { text: string; title: string }[];
  sections: { paragraphs: string[]; title: string }[];
  title: string;
};

/** Legal text as one readable column: short line length, clear section titles. */
export function LegalArticle({ description, intro, notes = [], sections, title }: LegalArticleProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="container-shell">
        <div className="content-shell pb-20 pt-10 sm:pt-12">
          <article className="max-w-[44rem]">
          {intro ? <p className="section-copy text-[1.0625rem]">{intro}</p> : null}
          {sections.map((section) => (
            <section key={section.title} className="mt-10 first:mt-0">
              <h2 className="card-title text-[1.6rem] text-foreground">{section.title}</h2>
              <div className="mt-3 space-y-3 leading-7 text-muted">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={`${section.title}-${index}`} className="[overflow-wrap:anywhere]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
          {notes.map((note) => (
            <aside key={note.title} className="mt-10 rounded-xl border border-[var(--border)] bg-surface px-5 py-4">
              <p className="font-medium text-foreground">{note.title}</p>
              <p className="mt-1 text-[0.9375rem] leading-7 text-muted">{note.text}</p>
            </aside>
          ))}
          </article>
        </div>
      </div>
    </>
  );
}
