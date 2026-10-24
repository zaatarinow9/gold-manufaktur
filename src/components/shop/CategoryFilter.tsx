"use client";

type CategoryFilterItem = {
  count: number;
  label: string;
  slug: string;
};

type CategoryFilterProps = {
  activeCategory: string;
  categories: CategoryFilterItem[];
  label: string;
  onSelect: (slug: string) => void;
};

/** One scrollable row of category chips on phones, wrapping on larger screens. */
export function CategoryFilter({ activeCategory, categories, label, onSelect }: CategoryFilterProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="scroll-rail -mx-4 min-w-0 px-4 sm:mx-0 sm:flex sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0"
    >
      {categories.map((category) => {
        const isActive = category.slug === activeCategory;
        return (
          <button
            key={category.slug}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(category.slug)}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[0.9375rem] font-medium transition ${
              isActive
                ? "border-gold bg-gold text-[#1a1209]"
                : "border-[var(--border-strong)] text-muted hover:border-gold-soft hover:text-foreground"
            }`}
          >
            {category.label}
            <span className={`text-[0.8125rem] tabular-nums ${isActive ? "text-[#1a1209]/70" : "text-text-soft"}`}>
              {category.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
