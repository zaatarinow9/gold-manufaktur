import "server-only";

import { z } from "zod";

import type { Json } from "@/lib/supabase/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/service";

import { createAdminNotification } from "./notifications";
import {
  getAdminNotificationEmail,
  getSupportNotificationEmail,
} from "./siteSettings";

export const customerInquiryStatusValues = [
  "new",
  "read",
  "in_progress",
  "replied",
  "archived",
] as const;

export type CustomerInquiryStatus =
  (typeof customerInquiryStatusValues)[number];

export const inquiryOptionValueSchema = z.object({
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

export const customerInquirySchema = z.object({
  customerEmail: z.string().trim().email().max(160),
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z.string().trim().min(6).max(80),
  locale: z.string().trim().min(2).max(12),
  message: z.string().trim().min(10).max(2000),
  optionValues: z.array(inquiryOptionValueSchema).default([]),
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
  source: z.enum(["contact", "order_entry", "product"]),
});

export type CustomerInquiryInput = z.infer<typeof customerInquirySchema>;

export type CustomerInquiryRecord = {
  archivedAt: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  deletedAt: string;
  id: string;
  locale: string;
  message: string;
  optionValues: Array<z.infer<typeof inquiryOptionValueSchema>>;
  productId: string;
  productSnapshot: {
    categoryName: string;
    id: string;
    imageUrl: string;
    name: string;
    price: string;
    sku: string;
    slug: string;
  } | null;
  source: CustomerInquiryInput["source"];
  status: CustomerInquiryStatus;
  updatedAt: string;
};

type InquiryRow = {
  archived_at: string | null;
  created_at: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  deleted_at: string | null;
  id: string;
  locale: string | null;
  message: string | null;
  option_values: Json;
  product_id: string | null;
  product_snapshot: Json;
  source: CustomerInquiryInput["source"];
  status: CustomerInquiryStatus;
  updated_at: string;
};

type InquiryCountClient = {
  from: (table: "customer_inquiries") => {
    select: (
      columns: string,
      options: { count: "exact"; head: true }
    ) => {
      eq: (column: string, value: string) => {
        is: (column: string, value: null) => {
          is: (column: string, value: null) => Promise<{
            count: number | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
};

function getInquiryTableClient() {
  return createSupabaseAdminClient() as unknown as {
    from: (table: string) => {
      delete: () => {
        eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
      insert: (
        value: Record<string, unknown>
      ) => {
        select: (columns: string) => {
          single: () => Promise<{
            data: { id: string; created_at: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
      select: (columns: string, options?: Record<string, unknown>) => {
        is: (column: string, value: null) => {
          order: (column: string, options?: Record<string, unknown>) => Promise<{
            data: InquiryRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
      update: (
        value: Record<string, unknown>
      ) => {
        eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };
}

function parseProductSnapshot(value: Json) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Record<string, Json | undefined>;

  return {
    categoryName:
      typeof snapshot.categoryName === "string" ? snapshot.categoryName : "",
    id: typeof snapshot.id === "string" ? snapshot.id : "",
    imageUrl: typeof snapshot.imageUrl === "string" ? snapshot.imageUrl : "",
    name: typeof snapshot.name === "string" ? snapshot.name : "",
    price: typeof snapshot.price === "string" ? snapshot.price : "",
    sku: typeof snapshot.sku === "string" ? snapshot.sku : "",
    slug: typeof snapshot.slug === "string" ? snapshot.slug : "",
  };
}

function parseOptionValues(value: Json) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => inquiryOptionValueSchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data);
}

function mapInquiryRow(row: InquiryRow): CustomerInquiryRecord {
  return {
    archivedAt: row.archived_at ?? "",
    createdAt: row.created_at,
    customerEmail: row.customer_email ?? "",
    customerName: row.customer_name ?? "",
    customerPhone: row.customer_phone ?? "",
    deletedAt: row.deleted_at ?? "",
    id: row.id,
    locale: row.locale ?? "de",
    message: row.message ?? "",
    optionValues: parseOptionValues(row.option_values),
    productId: row.product_id ?? "",
    productSnapshot: parseProductSnapshot(row.product_snapshot),
    source: row.source,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function formatInquiryOptionValue(value: z.infer<typeof inquiryOptionValueSchema>["value"]) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return value ?? "";
}

function buildInquiryEmailText(input: CustomerInquiryInput) {
  const productLines =
    input.source === "product" || input.source === "order_entry"
      ? [
          "",
          `Produkt: ${input.productSnapshot?.name || "Nicht angegeben"}`,
          `Kategorie: ${input.productSnapshot?.categoryName || "Nicht angegeben"}`,
          `Preis: ${input.productSnapshot?.price || "Nicht angegeben"}`,
          `Produkt-ID: ${input.productSnapshot?.id || "Nicht angegeben"}`,
          `SKU: ${input.productSnapshot?.sku || "Nicht angegeben"}`,
          `Slug: ${input.productSnapshot?.slug || "Nicht angegeben"}`,
          `Bild: ${input.productSnapshot?.imageUrl || "Nicht angegeben"}`,
          "",
          "Ausgewaehlte Optionen:",
          ...(input.optionValues.length > 0
            ? input.optionValues.map(
                (option) =>
                  `- ${option.label}: ${formatInquiryOptionValue(option.value) || "Nicht angegeben"}`
              )
            : ["- Keine"]),
        ]
      : [];

  return [
    input.source === "contact"
      ? "Es wurde eine neue Kontaktanfrage uebermittelt."
      : input.source === "product"
        ? "Es wurde eine neue Produktanfrage uebermittelt."
        : "Es wurde ein neuer Auftragseingang uebermittelt.",
    "",
    `Name: ${input.customerName}`,
    `E-Mail: ${input.customerEmail}`,
    `Telefon: ${input.customerPhone}`,
    `Sprache: ${input.locale}`,
    ...productLines,
    "",
    "Nachricht:",
    input.message,
  ].join("\n");
}

export async function createCustomerInquiry(input: CustomerInquiryInput) {
  const parsed = customerInquirySchema.parse(input);
  const supabase = getInquiryTableClient();
  const payload = {
    customer_email: parsed.customerEmail,
    customer_name: parsed.customerName,
    customer_phone: parsed.customerPhone,
    locale: parsed.locale,
    message: parsed.message,
    option_values: parsed.optionValues,
    product_id: parsed.productSnapshot?.id || null,
    product_snapshot: parsed.productSnapshot ?? {},
    source: parsed.source,
    status: "new",
  };
  const { data, error } = await supabase
    .from("customer_inquiries")
    .insert(payload)
    .select("id, created_at")
    .single();

  if (error || !data) {
    throw new Error(`Unable to save inquiry: ${error?.message ?? "unknown_error"}`);
  }

  await createAdminNotification({
    entityId: data.id,
    entityType: "customer_inquiry",
    linkPath: "/admin/inquiries",
    message:
      parsed.source === "contact"
        ? `${parsed.customerName} sent a general inquiry.`
        : `${parsed.customerName} sent a request for ${parsed.productSnapshot?.name || "a product"}.`,
    title:
      parsed.source === "contact"
        ? "New customer inquiry"
        : "New product inquiry",
    type: "system",
  });

  const configuredRecipient =
    (await getAdminNotificationEmail()) || (await getSupportNotificationEmail());
  const fallbackRecipient = process.env.CONTACT_RECEIVER_EMAIL?.trim() ?? "";
  const recipientEmail = configuredRecipient || fallbackRecipient;
  const subject =
    parsed.source === "contact"
      ? "Neue Kontaktanfrage - GoldHelwah"
      : "Neue Produktanfrage - GoldHelwah";
  const emailResult = await sendTransactionalEmail({
    metadata: {
      inquiryId: data.id,
      kind: "customer_inquiry",
      source: parsed.source,
    },
    recipientEmail,
    replyTo: parsed.customerEmail,
    skipDeliveryReason: recipientEmail ? undefined : "missing_admin_notification_email",
    subject,
    text: buildInquiryEmailText(parsed),
  });

  return {
    createdAt: data.created_at,
    emailResult,
    inquiryId: data.id,
  };
}

export async function listCustomerInquiries(): Promise<CustomerInquiryRecord[]> {
  const supabase = getInquiryTableClient();
  const { data, error } = await supabase
    .from("customer_inquiries")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load inquiries: ${error.message}`);
  }

  return (data ?? []).map(mapInquiryRow);
}

export async function getUnreadCustomerInquiryCount() {
  const supabase = createSupabaseAdminClient() as unknown as InquiryCountClient;
  const { count, error } = await supabase
    .from("customer_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new")
    .is("archived_at", null)
    .is("deleted_at", null);

  if (error) {
    console.warn(`[inquiries] Unable to count unread inquiries: ${error.message}`);
    return 0;
  }

  return count ?? 0;
}

export async function updateCustomerInquiryStatus(
  inquiryId: string,
  status: CustomerInquiryStatus
) {
  const supabase = getInquiryTableClient();
  const { error } = await supabase
    .from("customer_inquiries")
    .update({
      archived_at: status === "archived" ? new Date().toISOString() : null,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);

  if (error) {
    throw new Error(`Unable to update inquiry: ${error.message}`);
  }
}

export async function deleteCustomerInquiry(inquiryId: string) {
  const supabase = getInquiryTableClient();
  const { error } = await supabase
    .from("customer_inquiries")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);

  if (error) {
    throw new Error(`Unable to delete inquiry: ${error.message}`);
  }
}
