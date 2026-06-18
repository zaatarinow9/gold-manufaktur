import { z } from "zod";

import type { Json } from "@/lib/supabase/types";

export const jewelryKaratValues = ["14", "18", "21"] as const;
export const nameCustomizationLanguageValues = ["ar", "en"] as const;

export type JewelryKarat = (typeof jewelryKaratValues)[number];
export type NameCustomizationLanguage =
  (typeof nameCustomizationLanguageValues)[number];

export type ProductSpecifications = {
  karat: JewelryKarat | null;
  nameCustomization: {
    enabled: boolean;
    language: NameCustomizationLanguage | null;
    text: string | null;
  };
  weightGrams: number | null;
};

export const productSpecificationsSchema = z
  .object({
    karat: z.enum(jewelryKaratValues),
    nameCustomization: z.object({
      enabled: z.boolean(),
      language: z.enum(nameCustomizationLanguageValues).nullable(),
      text: z.string().trim().max(255).nullable(),
    }),
    weightGrams: z.number().finite().positive(),
  })
  .superRefine((value, context) => {
    if (!value.nameCustomization.enabled) {
      return;
    }

    if (!value.nameCustomization.language) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NAME_CUSTOMIZATION_LANGUAGE_REQUIRED",
        path: ["nameCustomization", "language"],
      });
    }

    if (!value.nameCustomization.text?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NAME_CUSTOMIZATION_TEXT_REQUIRED",
        path: ["nameCustomization", "text"],
      });
    }
  });

export type ProductSpecificationsInput = z.infer<
  typeof productSpecificationsSchema
>;

export function createProductSpecifications(
  input: ProductSpecificationsInput
): ProductSpecifications {
  const text = input.nameCustomization.text?.trim() ?? "";

  return {
    karat: input.karat,
    nameCustomization: input.nameCustomization.enabled
      ? {
          enabled: true,
          language: input.nameCustomization.language,
          text: text.length > 0 ? text : null,
        }
      : {
          enabled: false,
          language: null,
          text: null,
        },
    weightGrams: input.weightGrams,
  };
}

export function emptyProductSpecifications(): ProductSpecifications {
  return {
    karat: null,
    nameCustomization: {
      enabled: false,
      language: null,
      text: null,
    },
    weightGrams: null,
  };
}

export function getProductSpecifications(
  value: Json | null | undefined
): ProductSpecifications {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyProductSpecifications();
  }

  const record = value as Record<string, Json | undefined>;
  const nameCustomization =
    record.nameCustomization &&
    typeof record.nameCustomization === "object" &&
    !Array.isArray(record.nameCustomization)
      ? (record.nameCustomization as Record<string, Json | undefined>)
      : null;
  const karat = record.karat;
  const weightGrams = record.weightGrams;
  const language = nameCustomization?.language;
  const text = nameCustomization?.text;

  return {
    karat: jewelryKaratValues.includes(karat as JewelryKarat)
      ? (karat as JewelryKarat)
      : null,
    nameCustomization: {
      enabled: nameCustomization?.enabled === true,
      language: nameCustomizationLanguageValues.includes(
        language as NameCustomizationLanguage
      )
        ? (language as NameCustomizationLanguage)
        : null,
      text: typeof text === "string" && text.trim().length > 0
        ? text.trim()
        : null,
    },
    weightGrams: typeof weightGrams === "number" && Number.isFinite(weightGrams)
      ? weightGrams
      : null,
  };
}

export function formatWeightGrams(weightGrams: number | null | undefined) {
  if (typeof weightGrams !== "number" || !Number.isFinite(weightGrams)) {
    return null;
  }

  return `${weightGrams.toString()} g`;
}
