"use client";

type CategoryFilterItem = {
  label: string;
  slug: string;
};

type CategoryFilterProps = {
  activeCategory: string;
  categories: CategoryFilterItem[];
  onSelect: (slug: string) => void;
};

export function CategoryFilter({
  activeCategory,
  categories,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="rtl-inline-row flex w-full min-w-0 flex-wrap gap-3 overflow-x-auto pb-2 md:overflow-visible">
      {categories.map((category) => {
        const isActive = category.slug === activeCategory;

        return (
          <button
            key={category.slug}
            type="button"
            onClick={() => onSelect(category.slug)}
            className={`inline-flex max-w-full items-center rounded-full border px-4 py-2.5 text-start text-sm font-medium [overflow-wrap:anywhere] transition ${
              isActive
                ? "border-gold/30 bg-gold text-[#140d07] shadow-[0_16px_35px_rgba(196,154,82,0.18)]"
                : "border-white/10 bg-white/4 text-muted hover:border-gold/25 hover:bg-white/6 hover:text-foreground"
            }`}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
