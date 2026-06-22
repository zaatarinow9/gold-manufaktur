import { z } from "zod";

import { normalizePhoneNumber } from "@/lib/phone";

export const publicOrderEntryOptionValueSchema = z.object({
  key: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(255),
  optionId: z.string().uuid(),
  type: z.string().trim().min(1).max(80).default("text"),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
  ]),
});

export const publicOrderEntryRequestSchema = z.object({
  customerEmail: z.string().trim().email().max(160).or(z.literal("")).default(""),
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z
    .string()
    .trim()
    .transform((value) => normalizePhoneNumber(value))
    .refine((value) => value.length >= 6 && value.length <= 80, {
      message: "phone",
    }),
  emailUpdatesEnabled: z.boolean().default(true),
  locale: z.string().trim().min(2).max(12).default("de"),
  message: z.string().trim().max(2000).default(""),
  optionValues: z.array(publicOrderEntryOptionValueSchema).default([]),
  productId: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(99).default(1),
  token: z.string().trim().min(16).max(255),
});

export type PublicOrderEntryRequestInput = z.infer<
  typeof publicOrderEntryRequestSchema
>;
