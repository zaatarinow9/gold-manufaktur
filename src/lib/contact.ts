import { z } from "zod";

import { normalizePhoneNumber } from "@/lib/phone";

export const contactInquirySchema = z.object({
  name: z.string().trim().min(2, { message: "name" }).max(80, {
    message: "name",
  }),
  email: z.string().trim().email({ message: "email" }).max(160, {
    message: "email",
  }),
  phone: z
    .string()
    .trim()
    .transform((value) => normalizePhoneNumber(value))
    .refine((value) => value.length >= 6 && value.length <= 40, {
      message: "phone",
    }),
  message: z.string().trim().min(10, { message: "message" }).max(1500, {
    message: "message",
  }),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;

export const publicInquiryOptionValueSchema = z.object({
  key: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(255),
  type: z.string().trim().min(1).max(80).default("text"),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
  ]),
});

export const publicInquiryRequestSchema = contactInquirySchema.extend({
  locale: z.string().trim().min(2).max(12).default("de"),
  optionValues: z.array(publicInquiryOptionValueSchema).default([]),
  productSnapshot: z
    .object({
      categoryName: z.string().trim().max(255).optional().default(""),
      id: z.string().trim().min(1).max(120),
      imageUrl: z.string().trim().max(500).optional().default(""),
      name: z.string().trim().min(1).max(255),
      price: z.string().trim().max(120).optional().default(""),
      sku: z.string().trim().max(120).optional().default(""),
      slug: z.string().trim().max(255).optional().default(""),
    })
    .nullable()
    .default(null),
  source: z.enum(["contact", "product"]).default("contact"),
});

export type PublicInquiryRequestInput = z.infer<typeof publicInquiryRequestSchema>;

export const contactInquiryDefaults: ContactInquiryInput = {
  name: "",
  email: "",
  phone: "",
  message: "",
};
