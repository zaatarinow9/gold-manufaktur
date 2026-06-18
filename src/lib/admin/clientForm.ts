"use client";

export function getRequiredFieldBadge(locale: string) {
  if (locale === "de") {
    return "Pflichtfeld";
  }

  if (locale === "ar") {
    return "مطلوب";
  }

  if (locale === "fr") {
    return "Obligatoire";
  }

  if (locale === "tr") {
    return "Zorunlu";
  }

  return "Required";
}

export function focusFirstInvalidField(fieldErrors: Record<string, string>) {
  if (typeof document === "undefined") {
    return;
  }

  const firstField = Object.keys(fieldErrors)[0];

  if (!firstField) {
    return;
  }

  const escapedName = CSS.escape(firstField);
  const target = document.querySelector<HTMLElement>(
    `[name="${escapedName}"], #${escapedName}`
  );

  if (!target) {
    return;
  }

  target.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  if ("focus" in target) {
    window.setTimeout(() => {
      target.focus({ preventScroll: true });
    }, 120);
  }
}

export function scrollCardIntoView(element: HTMLElement | null) {
  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
