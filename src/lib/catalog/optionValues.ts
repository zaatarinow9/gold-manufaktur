import type { AppLocale } from "@/i18n/routing";

export type OptionValueLabels = Partial<Record<AppLocale, string>>;

export type OptionValueRecord = {
  /** Default label (German, or whatever was entered first). */
  label: string;
  /** Optional per-language labels; missing languages fall back to `label`. */
  labels?: OptionValueLabels;
  /** Stable value stored on orders and inquiries. */
  value: string;
};

const localeKeys: AppLocale[] = ["de", "ar", "en", "fr", "tr"];

function readLabels(raw: unknown): OptionValueLabels | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const labels: OptionValueLabels = {};

  for (const locale of localeKeys) {
    const value = (raw as Record<string, unknown>)[locale];
    if (typeof value === "string" && value.trim()) {
      labels[locale] = value.trim();
    }
  }

  return Object.keys(labels).length > 0 ? labels : undefined;
}

/**
 * Reads `options.values_json`. When `locale` is given, `label` is resolved to
 * that language (falling back to German, then the stored default label).
 */
export function parseOptionValues(json: unknown, locale?: AppLocale): OptionValueRecord[] {
  if (!Array.isArray(json)) {
    return [];
  }

  return json.flatMap((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as { label?: unknown }).label !== "string" ||
      typeof (entry as { value?: unknown }).value !== "string"
    ) {
      return [];
    }

    const { label, value } = entry as { label: string; value: string };
    const labels = readLabels((entry as { labels?: unknown }).labels);
    const resolved = locale ? labels?.[locale] || labels?.de || label : label;

    return [{ label: resolved, value, ...(labels ? { labels } : {}) }];
  });
}
