const ARABIC_INDIC_DIGIT_OFFSET = "٠".charCodeAt(0);
const EASTERN_ARABIC_DIGIT_OFFSET = "۰".charCodeAt(0);
const DIRECTION_MARKS_PATTERN = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
const NON_PHONE_SYMBOL_PATTERN = /[^\d+]/g;
const EXTRA_PLUS_PATTERN = /(?!^)\+/g;

function normalizeUnicodeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);

    if (code >= ARABIC_INDIC_DIGIT_OFFSET && code <= ARABIC_INDIC_DIGIT_OFFSET + 9) {
      return String(code - ARABIC_INDIC_DIGIT_OFFSET);
    }

    if (
      code >= EASTERN_ARABIC_DIGIT_OFFSET &&
      code <= EASTERN_ARABIC_DIGIT_OFFSET + 9
    ) {
      return String(code - EASTERN_ARABIC_DIGIT_OFFSET);
    }

    return digit;
  });
}

export function normalizePhoneNumber(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const compact = normalizeUnicodeDigits(value)
    .replace(DIRECTION_MARKS_PATTERN, "")
    .trim()
    .replace(NON_PHONE_SYMBOL_PATTERN, "")
    .replace(EXTRA_PLUS_PATTERN, "");

  if (!compact) {
    return "";
  }

  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\D/g, "")}`;
  }

  const digitsOnly = compact.replace(/\D/g, "");

  if (digitsOnly.startsWith("00")) {
    return `+${digitsOnly.slice(2)}`;
  }

  return digitsOnly;
}

export function getPhoneHref(value: string) {
  const normalized = normalizePhoneNumber(value);
  return normalized ? `tel:${normalized}` : "";
}

export function getWhatsAppHref(value: string) {
  const normalized = normalizePhoneNumber(value).replace(/^\+/, "");
  return normalized ? `https://wa.me/${normalized}` : "";
}
