export type NameCustomizationMode = "category" | "disabled" | "enabled";

export function resolveSupportsNameCustomization(
  categorySupport: boolean | null | undefined,
  productOverride: boolean | null | undefined
) {
  if (typeof productOverride === "boolean") {
    return productOverride;
  }

  return Boolean(categorySupport);
}

export function getNameCustomizationMode(
  productOverride: boolean | null | undefined
): NameCustomizationMode {
  if (productOverride === true) {
    return "enabled";
  }

  if (productOverride === false) {
    return "disabled";
  }

  return "category";
}
