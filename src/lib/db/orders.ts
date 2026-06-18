import "server-only";

import { z } from "zod";

import type { AdminViewer } from "@/lib/db/adminScope";
import {
  canAccessOrder,
  canAccessWorkshop,
  logAdminReadError,
} from "@/lib/db/adminScope";
import {
  normalizeOptionalDate,
  normalizeOptionalText,
  normalizeOptionalUuid,
} from "@/lib/admin/orderWorkflow";
import { createAdminNotification } from "@/lib/db/notifications";
import {
  buildCustomerOrderEmail,
  getEmailPublicStageFromMetadata,
  getEmailTemplateTypeFromMetadata,
  type CustomerEmailTemplateType,
  type CustomerEmailItem,
} from "@/lib/email/customerOrderEmails";
import { sendTransactionalEmail } from "@/lib/email/service";
import {
  getCanonicalTrackingStatusForPublicStage,
  getPublicTrackingStageFromStatus,
  resolvePublicTrackingStage,
} from "@/lib/orderTracking/publicStages";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json, TableInsert, TableRow, TableUpdate } from "@/lib/supabase/types";
import type {
  PublicTrackingStage,
  TrackingStatus,
  WorkshopOrderStatus,
} from "@/types/admin";
import type { AppLocale } from "@/i18n/routing";

const selectedOptionValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

const selectedOptionSchema = z.object({
  groupKey: z.string().trim().min(1).max(120),
  key: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(255),
  optionId: z.string().uuid(),
  value: selectedOptionValueSchema,
});

const localeSchema = z.enum(["de", "ar", "en", "fr", "tr"]);
const optionalUuidSchema = z.preprocess(
  normalizeOptionalUuid,
  z.string().uuid().nullable()
);

const orderNotesSchema = z.object({
  adminNotes: z.string().trim().max(4000).optional().default(""),
  customerNotes: z.string().trim().max(4000).optional().default(""),
  deliveryNotes: z.string().trim().max(4000).optional().default(""),
  packagingNotes: z.string().trim().max(4000).optional().default(""),
  qualityRequirements: z.string().trim().max(4000).optional().default(""),
  specialInstructions: z.string().trim().max(4000).optional().default(""),
  workshopNotes: z.string().trim().max(4000).optional().default(""),
});

const orderCreateSchema = z.object({
  attachments: z.array(z.string().trim().min(1).max(500)).default([]),
  currency: z.string().trim().max(12).default("EUR"),
  customerEmail: z.string().trim().email().max(160),
  customerLanguage: localeSchema.default("de"),
  customerName: z.string().trim().min(1).max(160),
  customerPhone: z.string().trim().max(80).optional().default(""),
  customerReference: z.string().trim().max(255).optional().default(""),
  dueDate: z.preprocess(normalizeOptionalDate, z.string().default("")),
  emailUpdatesEnabled: z.boolean().default(false),
  employeeId: optionalUuidSchema.default(null),
  goldDetails: z.record(z.string(), z.string().trim()).default({}),
  measurements: z.record(z.string(), z.string().trim()).default({}),
  notes: orderNotesSchema,
  personalization: z.record(z.string(), z.string().trim()).default({}),
  priority: z.enum(["normal", "urgent", "express"]).default("normal"),
  productCategoryName: z.string().trim().min(1).max(255),
  productCategorySlug: z.string().trim().min(1).max(255),
  productId: z.string().uuid(),
  productImage: z.string().trim().min(1).max(500),
  productName: z.string().trim().min(1).max(255),
  productSku: z.string().trim().min(1).max(120),
  productSlug: z.string().trim().min(1).max(255),
  quantity: z.number().int().min(1).max(999).default(1),
  referenceImages: z.array(z.string().trim().min(1).max(500)).default([]),
  selectedOptions: z.array(selectedOptionSchema).default([]),
  stones: z.record(z.string(), z.string().trim()).default({}),
  totalAmount: z.number().finite().nonnegative().nullable().default(null),
  workshopId: optionalUuidSchema.default(null),
});

const orderWorkflowUpdateSchema = z.object({
  customerNote: z.string().trim().max(4000).optional().default(""),
  employeeId: optionalUuidSchema.default(null),
  internalNote: z.string().trim().max(4000).optional().default(""),
  orderId: z.string().uuid(),
  publicStage: z
    .enum(["order_in_workshop", "shipping", "ready_for_pickup"])
    .nullable()
    .default(null),
  workshopId: optionalUuidSchema.default(null),
  status: z.enum([
    "created",
    "sent_to_workshop",
    "accepted_by_workshop",
    "in_production",
    "quality_check",
    "ready_for_pickup",
    "on_the_way",
    "delivered_to_store",
    "picked_up",
    "completed",
    "cancelled",
  ]),
});

export const supportTicketSchema = z.object({
  customerEmail: z.email().optional().or(z.literal("")).default(""),
  customerName: z.string().trim().max(160).optional().default(""),
  customerPhone: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().min(10).max(2000),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderWorkflowUpdateInput = z.infer<typeof orderWorkflowUpdateSchema>;
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
export type OrderCreatePayload = Omit<OrderCreateInput, "employeeId" | "workshopId"> & {
  employeeId?: string | null;
  workshopId?: string | null;
};
export type OrderWorkflowUpdatePayload = Omit<
  OrderWorkflowUpdateInput,
  "employeeId" | "workshopId"
> & {
  employeeId?: string | null;
  workshopId?: string | null;
};

export type OrderTrackingEventRecord = {
  createdAt: string;
  createdBy: string;
  description: string;
  id: string;
  isPublic: boolean;
  notifyCustomer: boolean;
  publicStage: PublicTrackingStage | null;
  status: TrackingStatus;
  title: string;
};

export type OrderItemRecord = {
  categoryName: string;
  categorySlug: string;
  id: string;
  notes: string;
  productId: string | null;
  productImage: string;
  productName: string;
  productSku: string;
  productSlug: string;
  quantity: number;
  referenceImages: string[];
  selectedOptions: Array<{
    groupKey: string;
    key: string;
    label: string;
    optionId: string;
    value: Json;
  }>;
};

export type SupportTicketRecord = {
  createdAt: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  id: string;
  message: string;
  status: "closed" | "in_progress" | "open" | "resolved";
  subject: string;
};

export type EmailLogRecord = {
  createdAt: string;
  errorMessage: string;
  id: string;
  provider: string;
  publicStage: PublicTrackingStage | null;
  recipientEmail: string;
  sentAt: string;
  status: "failed" | "pending" | "sent" | "skipped";
  subject: string;
  templateType: CustomerEmailTemplateType | null;
};

export type OrderListRecord = {
  createdAt: string;
  currency: string;
  customerEmail: string;
  customerName: string;
  dueDate: string;
  emailUpdatesEnabled: boolean;
  employeeId: string | null;
  employeeName: string;
  id: string;
  internalOrderNumber: string;
  itemCount: number;
  previewProductName: string;
  priority: "express" | "normal" | "urgent";
  publicTrackingStage: PublicTrackingStage | null;
  status: WorkshopOrderStatus;
  supportTicketCount: number;
  totalAmount: number | null;
  trackingNumber: string;
  trackingStatus: TrackingStatus;
  updatedAt: string;
  workshopId: string | null;
  workshopName: string;
};

export type OrderDetailRecord = OrderListRecord & {
  attachments: string[];
  customerPhone: string;
  customerLanguage: AppLocale;
  customerReference: string;
  emailLogs: EmailLogRecord[];
  goldDetails: Record<string, string>;
  items: OrderItemRecord[];
  measurements: Record<string, string>;
  notes: Record<string, string>;
  personalization: Record<string, string>;
  stones: Record<string, string>;
  supportTickets: SupportTicketRecord[];
  trackingEvents: OrderTrackingEventRecord[];
};

export type PublicTrackingOrderRecord = {
  customerName: string;
  latestCustomerNote: string;
  publicTrackingStage: PublicTrackingStage | null;
  supportTickets: SupportTicketRecord[];
  trackingEvents: OrderTrackingEventRecord[];
  trackingNumber: string;
  trackingStatus: TrackingStatus;
};

function emptyRecord() {
  return {} as Record<string, string>;
}

function getTextRecord(value: Json | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyRecord();
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

function getStringArray(value: Json | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function getJsonRecord(value: Json): Record<string, Json | undefined> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, Json | undefined>;
}

function getSelectedOptions(value: Json | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => getJsonRecord(item))
    .filter((item): item is Record<string, Json | undefined> => item !== null)
    .map((item) => ({
      groupKey: typeof item.groupKey === "string" ? item.groupKey : "",
      key: typeof item.key === "string" ? item.key : "",
      label: typeof item.label === "string" ? item.label : "",
      optionId: typeof item.optionId === "string" ? item.optionId : "",
      value: item.value ?? null,
    }))
    .filter((item) => item.optionId.length > 0);
}

function normalizeOrderStatus(value?: string | null): WorkshopOrderStatus {
  switch (value) {
    case "sent_to_workshop":
    case "accepted":
    case "assigned":
    case "in_production":
    case "quality_check":
    case "ready":
    case "delivered":
    case "cancelled":
    case "archived":
      return value;
    default:
      return "draft";
  }
}

function normalizeTrackingStatus(value?: string | null): TrackingStatus {
  switch (value) {
    case "sent_to_workshop":
    case "accepted_by_workshop":
    case "in_production":
    case "quality_check":
    case "ready_for_pickup":
    case "on_the_way":
    case "delivered_to_store":
    case "picked_up":
    case "completed":
    case "cancelled":
      return value;
    default:
      return "created";
  }
}

function normalizePriority(value?: string | null): "express" | "normal" | "urgent" {
  if (value === "express" || value === "urgent") {
    return value;
  }

  return "normal";
}

function normalizeLocale(value?: string | null): AppLocale {
  const result = localeSchema.safeParse(value);
  return result.success ? result.data : "de";
}

function normalizeCurrency(value?: string | null) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized || "EUR";
}

function normalizeAmount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function fallbackTrackingTitle(status: TrackingStatus) {
  return status
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function trackingStatusToOrderStatus(status: TrackingStatus): WorkshopOrderStatus {
  switch (status) {
    case "sent_to_workshop":
      return "sent_to_workshop";
    case "accepted_by_workshop":
      return "accepted";
    case "in_production":
      return "in_production";
    case "quality_check":
      return "quality_check";
    case "ready_for_pickup":
    case "on_the_way":
      return "ready";
    case "delivered_to_store":
    case "picked_up":
    case "completed":
      return "delivered";
    case "cancelled":
      return "cancelled";
    default:
      return "draft";
  }
}

function formatSelectedOptionValue(value: Json) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return typeof value === "string" ? value.trim() : "";
}

function getFirstDefinedValue(record: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function getSizeSummary(measurements: Record<string, string>) {
  return getFirstDefinedValue(measurements, [
    "ringSize",
    "braceletSize",
    "chainLength",
    "pendantSize",
    "customMeasurements",
    "width",
    "height",
    "length",
  ]);
}

function getWeightSummary(goldDetails: Record<string, string>) {
  return getFirstDefinedValue(goldDetails, [
    "estimatedWeight",
    "targetWeight",
    "weightTolerance",
  ]);
}

function getEngravingSummary(personalization: Record<string, string>) {
  return getFirstDefinedValue(personalization, [
    "engravingText",
    "nameText",
  ]);
}

function findSelectedOptionMatch(
  item: OrderItemRecord,
  pattern: RegExp
) {
  for (const option of item.selectedOptions) {
    const haystack = `${option.groupKey} ${option.key} ${option.label}`;

    if (pattern.test(haystack)) {
      const value = formatSelectedOptionValue(option.value);

      if (value) {
        return value;
      }
    }
  }

  return null;
}

function buildCustomerEmailItems(input: {
  goldDetails: Record<string, string>;
  items: OrderItemRecord[];
  measurements: Record<string, string>;
  personalization: Record<string, string>;
  totalAmount: number | null;
}) {
  const hasSingleItem = input.items.length === 1;

  return input.items.map((item) => {
    const quantity = item.quantity > 0 ? item.quantity : 1;
    const itemTotalPrice =
      hasSingleItem && typeof input.totalAmount === "number" ? input.totalAmount : null;
    const unitPrice =
      itemTotalPrice !== null ? itemTotalPrice / quantity : null;
    const karat =
      getFirstDefinedValue(input.goldDetails, ["goldKarat"]) ??
      findSelectedOptionMatch(item, /karat|carat|ayar|عيار/i);
    const weight =
      getWeightSummary(input.goldDetails) ??
      findSelectedOptionMatch(item, /weight|gram|وزن/i);
    const size =
      getSizeSummary(input.measurements) ??
      findSelectedOptionMatch(item, /size|ring|bracelet|chain|length|width|height|مقاس/i);
    const engraving =
      getEngravingSummary(input.personalization) ??
      findSelectedOptionMatch(item, /engraving|name|text|نقش|اسم/i);

    return {
      engraving,
      karat,
      name: item.productName || item.productSku || item.id,
      options: item.selectedOptions
        .map((option) => {
          const value = formatSelectedOptionValue(option.value);
          return value ? `${option.label}: ${value}` : "";
        })
        .filter(Boolean),
      quantity,
      size,
      totalPrice: itemTotalPrice,
      unitPrice,
      weight,
    } satisfies CustomerEmailItem;
  });
}

function getTrackingStatusNote(
  locale: AppLocale,
  publicStage: PublicTrackingStage | null
) {
  if (!publicStage) {
    if (locale === "ar") {
      return "تم استلام طلبك وسيتم تحديث الحالة العامة قريبًا.";
    }

    if (locale === "de") {
      return "Ihr Auftrag wurde erhalten. Der Status wird bald aktualisiert.";
    }

    if (locale === "fr") {
      return "Votre commande a bien ete recue. Le statut sera bientot mis a jour.";
    }

    if (locale === "tr") {
      return "Siparisiniz alindi. Durum yakinda guncellenecek.";
    }

    return "We received your order. The status will be updated soon.";
  }

  switch (publicStage) {
    case "order_in_workshop":
      if (locale === "ar") {
        return "طلبك أصبح الآن في الورشة ويتم العمل عليه.";
      }

      if (locale === "de") {
        return "Ihr Auftrag befindet sich jetzt in der Werkstatt.";
      }

      if (locale === "fr") {
        return "Votre commande est maintenant en atelier.";
      }

      if (locale === "tr") {
        return "Siparisiniz su anda atolyede.";
      }

      return "Your order is now in the workshop.";
    case "shipping":
      if (locale === "ar") {
        return "طلبك قيد الشحن الآن.";
      }

      if (locale === "de") {
        return "Ihr Auftrag wird jetzt versendet.";
      }

      if (locale === "fr") {
        return "Votre commande est en cours d expedition.";
      }

      if (locale === "tr") {
        return "Siparisiniz su anda kargoya veriliyor.";
      }

      return "Your order is being shipped.";
    case "ready_for_pickup":
      if (locale === "ar") {
        return "طلبك جاهز للاستلام.";
      }

      if (locale === "de") {
        return "Ihr Auftrag ist jetzt zur Abholung bereit.";
      }

      if (locale === "fr") {
        return "Votre commande est prete au retrait.";
      }

      if (locale === "tr") {
        return "Siparisiniz teslim almaya hazir.";
      }

      return "Your order is ready for pickup.";
  }
}

async function hasSentCustomerEmail(input: {
  orderId: string;
  publicStage?: PublicTrackingStage | null;
  templateType: CustomerEmailTemplateType;
}) {
  const supabase = createSupabaseAdminClient();
  const metadataFilter: Record<string, string> = {
    templateType: input.templateType,
  };

  if (input.publicStage) {
    metadataFilter.publicStage = input.publicStage;
  }

  const { data, error } = await supabase
    .from("email_logs")
    .select("id")
    .eq("order_id", input.orderId)
    .eq("status", "sent")
    .contains("metadata_json", metadataFilter)
    .limit(1);

  if (error) {
    logAdminReadError("customer email dedupe", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

function fallbackInternalOrderNumber(
  order: Pick<TableRow<"orders">, "id" | "internal_order_number" | "tracking_number">
) {
  return (
    order.internal_order_number ??
    `ORD-${order.tracking_number ?? order.id.slice(0, 8).toUpperCase()}`
  );
}

function getScopedOrderRows(
  viewer: AdminViewer,
  orders: TableRow<"orders">[]
) {
  return orders.filter((order) =>
    canAccessOrder(viewer, {
      assignedAdminId: order.assigned_admin_id ?? null,
      employeeId: order.employee_id ?? null,
      workshopId: order.workshop_id ?? null,
    })
  );
}

async function loadOrdersRaw() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logAdminReadError("orders", error.message);
    return [];
  }

  return data;
}

async function loadOrderItemsRaw(orderIds: string[]) {
  if (orderIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (error) {
    logAdminReadError("order items", error.message);
    return [];
  }

  return data;
}

async function loadOrderEventsRaw(orderIds: string[]) {
  if (orderIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_status_events")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (error) {
    logAdminReadError("order events", error.message);
    return [];
  }

  return data;
}

async function loadSupportTicketsRaw(orderIds: string[]) {
  if (orderIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false });

  if (error) {
    logAdminReadError("support tickets", error.message);
    return [];
  }

  return data;
}

async function loadEmailLogsRaw(orderIds: string[]) {
  if (orderIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false });

  if (error) {
    logAdminReadError("email logs", error.message);
    return [];
  }

  return data;
}

async function loadWorkshopsMap() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("workshops").select("*");

  if (error) {
    logAdminReadError("order workshops", error.message);
    return new Map<string, { name: string }>();
  }

  return new Map(data.map((workshop) => [workshop.id, { name: workshop.name }]));
}

async function loadEmployeesMap() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("employees").select("*");

  if (error) {
    logAdminReadError("order employees", error.message);
    return new Map<string, { name: string }>();
  }

  return new Map(data.map((employee) => [employee.id, { name: employee.full_name }]));
}

function mapOrderTrackingEvent(event: {
  actor_name?: string | null;
  created_at: string;
  description?: string | null;
  id: string;
  is_public?: boolean;
  note?: string | null;
  notify_customer?: boolean;
  status?: string | null;
  title?: string | null;
}) {
  const status = normalizeTrackingStatus(event.status ?? "created");
  const publicStage =
    event.is_public === false ? null : getPublicTrackingStageFromStatus(status);

  return {
    createdAt: event.created_at,
    createdBy: event.actor_name ?? "GoldHelwah Team",
    description: event.description ?? event.note ?? "",
    id: event.id,
    isPublic: event.is_public ?? true,
    notifyCustomer: event.notify_customer ?? false,
    publicStage,
    status,
    title: event.title ?? fallbackTrackingTitle(status),
  } satisfies OrderTrackingEventRecord;
}

function mapOrderItem(item: TableRow<"order_items">) {
  return {
    categoryName: item.category_name_snapshot ?? "",
    categorySlug: item.category_slug_snapshot ?? "",
    id: item.id,
    notes: item.notes ?? "",
    productId: item.product_id ?? null,
    productImage: item.product_image_snapshot ?? "",
    productName: item.product_name_snapshot ?? "",
    productSku: item.product_sku_snapshot ?? "",
    productSlug: item.product_slug_snapshot ?? "",
    quantity: item.quantity,
    referenceImages: getStringArray(item.reference_images_json),
    selectedOptions: getSelectedOptions(item.selected_options_json),
  } satisfies OrderItemRecord;
}

function mapSupportTicket(ticket: TableRow<"support_tickets">) {
  return {
    createdAt: ticket.created_at,
    customerEmail: ticket.customer_email ?? "",
    customerName: ticket.customer_name ?? "",
    customerPhone: ticket.customer_phone ?? "",
    id: ticket.id,
    message: ticket.message,
    status: ticket.status,
    subject: ticket.subject,
  } satisfies SupportTicketRecord;
}

function mapEmailLog(log: TableRow<"email_logs">) {
  return {
    createdAt: log.created_at,
    errorMessage: log.error_message ?? "",
    id: log.id,
    provider: log.provider ?? "log_only",
    publicStage: getEmailPublicStageFromMetadata(log.metadata_json),
    recipientEmail: log.recipient_email,
    sentAt: log.sent_at ?? "",
    status: log.status,
    subject: log.subject,
    templateType: getEmailTemplateTypeFromMetadata(log.metadata_json),
  } satisfies EmailLogRecord;
}

async function loadScopedOrderBundle(viewer: AdminViewer) {
  const orders = getScopedOrderRows(viewer, await loadOrdersRaw());
  const orderIds = orders.map((order) => order.id);

  const [items, events, tickets, emailLogs, workshopMap, employeeMap] =
    await Promise.all([
      loadOrderItemsRaw(orderIds),
      loadOrderEventsRaw(orderIds),
      loadSupportTicketsRaw(orderIds),
      loadEmailLogsRaw(orderIds),
      loadWorkshopsMap(),
      loadEmployeesMap(),
    ]);

  return {
    emailLogs,
    employeeMap,
    events,
    items,
    orders,
    tickets,
    workshopMap,
  };
}

export async function getScopedOrders(
  viewer: AdminViewer
): Promise<OrderListRecord[]> {
  const bundle = await loadScopedOrderBundle(viewer);
  const itemsByOrderId = new Map<string, OrderItemRecord[]>();
  const ticketsByOrderId = new Map<string, SupportTicketRecord[]>();

  bundle.items.forEach((item) => {
    const current = itemsByOrderId.get(item.order_id) ?? [];
    current.push(mapOrderItem(item));
    itemsByOrderId.set(item.order_id, current);
  });

  bundle.tickets.forEach((ticket) => {
    const current = ticketsByOrderId.get(ticket.order_id) ?? [];
    current.push(mapSupportTicket(ticket));
    ticketsByOrderId.set(ticket.order_id, current);
  });

  return bundle.orders.map((order) => {
    const orderItems = itemsByOrderId.get(order.id) ?? [];

    return {
      createdAt: order.created_at,
      currency: normalizeCurrency(order.currency),
      customerEmail: order.customer_email ?? "",
      customerName: order.customer_name ?? "",
      dueDate: order.due_date ?? "",
      emailUpdatesEnabled: order.email_updates_enabled ?? false,
      employeeId: order.employee_id ?? null,
      employeeName: bundle.employeeMap.get(order.employee_id ?? "")?.name ?? "",
      id: order.id,
      internalOrderNumber: fallbackInternalOrderNumber(order),
      itemCount: orderItems.length,
      previewProductName: orderItems[0]?.productName ?? "",
      priority: normalizePriority(order.priority),
      publicTrackingStage: resolvePublicTrackingStage({
        publicTrackingStage: order.public_tracking_stage,
        trackingStatus: normalizeTrackingStatus(order.tracking_status),
      }),
      status: normalizeOrderStatus(order.status),
      supportTicketCount: ticketsByOrderId.get(order.id)?.length ?? 0,
      totalAmount: normalizeAmount(order.total_amount),
      trackingNumber: order.tracking_number,
      trackingStatus: normalizeTrackingStatus(order.tracking_status),
      updatedAt: order.updated_at,
      workshopId: order.workshop_id ?? null,
      workshopName: bundle.workshopMap.get(order.workshop_id ?? "")?.name ?? "",
    };
  });
}

export async function getScopedOrderDetail(
  viewer: AdminViewer,
  orderId: string
): Promise<OrderDetailRecord | null> {
  const bundle = await loadScopedOrderBundle(viewer);
  const order = bundle.orders.find((entry) => entry.id === orderId);

  if (!order) {
    return null;
  }

  const items = bundle.items
    .filter((item) => item.order_id === orderId)
    .map(mapOrderItem);
  const trackingEvents = bundle.events
    .filter((event) => event.order_id === orderId)
    .map(mapOrderTrackingEvent);
  const supportTickets = bundle.tickets
    .filter((ticket) => ticket.order_id === orderId)
    .map(mapSupportTicket);
  const emailLogs = bundle.emailLogs
    .filter((log) => log.order_id === orderId)
    .map(mapEmailLog);
  const orderNotes = getTextRecord(order.notes_json);
  const displayNotes = Object.fromEntries(
    Object.entries(orderNotes).filter((entry) => entry[0] !== "customerLanguage")
  ) as Record<string, string>;

  return {
    attachments: getStringArray(order.attachments_json),
    createdAt: order.created_at,
    currency: normalizeCurrency(order.currency),
    customerEmail: order.customer_email ?? "",
    customerLanguage: normalizeLocale(orderNotes.customerLanguage),
    customerName: order.customer_name ?? "",
    customerPhone: order.customer_phone ?? "",
    customerReference: order.customer_reference ?? "",
    dueDate: order.due_date ?? "",
    emailLogs,
    emailUpdatesEnabled: order.email_updates_enabled ?? false,
    employeeId: order.employee_id ?? null,
    employeeName: bundle.employeeMap.get(order.employee_id ?? "")?.name ?? "",
    goldDetails: getTextRecord(order.gold_details_json),
    id: order.id,
    internalOrderNumber: fallbackInternalOrderNumber(order),
    itemCount: items.length,
    items,
    measurements: getTextRecord(order.measurements_json),
    notes: {
      ...displayNotes,
      legacyNotes: order.notes ?? "",
    },
    personalization: getTextRecord(order.personalization_json),
    previewProductName: items[0]?.productName ?? "",
    priority: normalizePriority(order.priority),
    publicTrackingStage: resolvePublicTrackingStage({
      publicTrackingStage: order.public_tracking_stage,
      trackingStatus: normalizeTrackingStatus(order.tracking_status),
    }),
    status: normalizeOrderStatus(order.status),
    stones: getTextRecord(order.stones_json),
    supportTicketCount: supportTickets.length,
    supportTickets,
    totalAmount: normalizeAmount(order.total_amount),
    trackingEvents,
    trackingNumber: order.tracking_number,
    trackingStatus: normalizeTrackingStatus(order.tracking_status),
    updatedAt: order.updated_at,
    workshopId: order.workshop_id ?? null,
    workshopName: bundle.workshopMap.get(order.workshop_id ?? "")?.name ?? "",
  };
}

async function generateTrackingNumber() {
  const supabase = createSupabaseAdminClient();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { data, error } = await supabase
    .from("orders")
    .select("tracking_number")
    .like("tracking_number", `GH-${datePart}-%`);

  if (error) {
    throw new Error(`Unable to generate tracking number: ${error.message}`);
  }

  const sequence =
    data.reduce((maxValue, order) => {
      const match = order.tracking_number.match(/-(\d{4})$/);
      return Math.max(maxValue, match ? Number(match[1]) : 0);
    }, 0) + 1;

  return `GH-${datePart}-${String(sequence).padStart(4, "0")}`;
}

async function generateInternalOrderNumber() {
  const supabase = createSupabaseAdminClient();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { data, error } = await supabase
    .from("orders")
    .select("internal_order_number")
    .like("internal_order_number", `ORD-${datePart}-%`);

  if (error) {
    throw new Error(`Unable to generate order number: ${error.message}`);
  }

  const sequence =
    data.reduce((maxValue, order) => {
      const match = order.internal_order_number?.match(/-(\d{4})$/);
      return Math.max(maxValue, match ? Number(match[1]) : 0);
    }, 0) + 1;

  return `ORD-${datePart}-${String(sequence).padStart(4, "0")}`;
}

async function dispatchCustomerOrderEmail(input: {
  currency: string;
  customerEmail: string;
  customerName: string;
  customerNote?: string;
  goldDetails: Record<string, string>;
  items: OrderItemRecord[];
  locale: AppLocale;
  measurements: Record<string, string>;
  notificationId?: string | null;
  orderId: string;
  personalization: Record<string, string>;
  publicStage?: PublicTrackingStage | null;
  totalAmount: number | null;
  trackingNumber: string;
  type: CustomerEmailTemplateType;
}) {
  const email = buildCustomerOrderEmail({
    currency: input.currency,
    customerName: input.customerName,
    customerNote: input.customerNote,
    items: buildCustomerEmailItems({
      goldDetails: input.goldDetails,
      items: input.items,
      measurements: input.measurements,
      personalization: input.personalization,
      totalAmount: input.totalAmount,
    }),
    locale: input.locale,
    publicStage: input.publicStage,
    totalAmount: input.totalAmount,
    trackingNumber: input.trackingNumber,
    type: input.type,
  });
  const alreadySent = await hasSentCustomerEmail({
    orderId: input.orderId,
    publicStage: input.publicStage ?? null,
    templateType: input.type,
  });

  return sendTransactionalEmail({
    html: email.html,
    metadata: {
      kind:
        input.type === "order_confirmation"
          ? "customer_order_confirmation"
          : "customer_public_stage_update",
      locale: input.locale,
      publicStage: input.publicStage ?? null,
      templateType: input.type,
      trackingNumber: input.trackingNumber,
    },
    notificationId: input.notificationId ?? null,
    orderId: input.orderId,
    recipientEmail: input.customerEmail,
    replyTo: process.env.CONTACT_RECEIVER_EMAIL?.trim() || undefined,
    skipDeliveryReason: alreadySent ? "duplicate_customer_email" : undefined,
    subject: email.subject,
    text: email.text,
  });
}

export async function createOrder(
  viewer: AdminViewer,
  input: OrderCreatePayload,
  locale: AppLocale
) {
  const parsed = orderCreateSchema.parse({
    ...input,
    customerLanguage: input.customerLanguage ?? locale,
    customerPhone: normalizeOptionalText(input.customerPhone),
    customerReference: normalizeOptionalText(input.customerReference),
  });

  if (viewer.role === "employee") {
    throw new Error("ORDER_CREATE_FORBIDDEN");
  }

  if (parsed.employeeId && !parsed.workshopId) {
    throw new Error("WORKSHOP_REQUIRED_FOR_EMPLOYEE");
  }

  if (parsed.workshopId && !canAccessWorkshop(viewer, parsed.workshopId)) {
    throw new Error("INVALID_WORKSHOP_SELECTION");
  }

  const supabase = createSupabaseAdminClient();

  if (parsed.employeeId) {
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, workshop_id")
      .eq("id", parsed.employeeId)
      .maybeSingle();

    if (employeeError || !employee) {
      throw new Error("INVALID_EMPLOYEE_SELECTION");
    }

    if (employee.workshop_id !== parsed.workshopId) {
      throw new Error("INVALID_EMPLOYEE_WORKSHOP");
    }
  }

  const trackingNumber = await generateTrackingNumber();
  const internalOrderNumber = await generateInternalOrderNumber();
  const trackingStatus: TrackingStatus = "created";
  const status: WorkshopOrderStatus = "draft";
  const customerLocale = parsed.customerLanguage;
  const currency = normalizeCurrency(parsed.currency);
  const notesJson = {
    ...parsed.notes,
    customerLanguage: customerLocale,
  };
  const orderPayload = {
    assigned_admin_id: viewer.id,
    attachments_json: parsed.attachments,
    currency,
    customer_email: parsed.customerEmail,
    customer_name: parsed.customerName,
    customer_phone: parsed.customerPhone || null,
    customer_reference: parsed.customerReference || null,
    due_date: parsed.dueDate || null,
    email_updates_enabled: parsed.emailUpdatesEnabled,
    employee_id: parsed.employeeId,
    gold_details_json: parsed.goldDetails,
    internal_order_number: internalOrderNumber,
    measurements_json: parsed.measurements,
    notes: parsed.notes.adminNotes || parsed.notes.workshopNotes || null,
    notes_json: notesJson,
    personalization_json: parsed.personalization,
    priority: parsed.priority,
    public_tracking_stage: null,
    status,
    stones_json: parsed.stones,
    total_amount: parsed.totalAmount,
    tracking_number: trackingNumber,
    tracking_status: trackingStatus,
    workshop_id: parsed.workshopId,
  } satisfies TableInsert<"orders">;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select("*")
    .single();

  if (orderError) {
    throw new Error(`Unable to create order: ${orderError.message}`);
  }

  const itemPayload = {
    category_name_snapshot: parsed.productCategoryName,
    category_slug_snapshot: parsed.productCategorySlug,
    order_id: order.id,
    product_id: parsed.productId,
    product_image_snapshot: parsed.productImage,
    product_name_snapshot: parsed.productName,
    product_sku_snapshot: parsed.productSku,
    product_slug_snapshot: parsed.productSlug,
    quantity: parsed.quantity,
    reference_images_json: parsed.referenceImages,
    selected_options_json: parsed.selectedOptions,
  } satisfies TableInsert<"order_items">;

  const { error: itemError } = await supabase.from("order_items").insert(itemPayload);

  if (itemError) {
    throw new Error(`Unable to create order item: ${itemError.message}`);
  }

  const customerFacingNote =
    parsed.notes.customerNotes || getTrackingStatusNote(customerLocale, null);
  const eventPayload = {
    actor_name: viewer.name,
    created_by: viewer.id,
    description: customerFacingNote,
    is_public: true,
    notify_customer: false,
    order_id: order.id,
    status: trackingStatus,
    title: fallbackTrackingTitle(trackingStatus),
  } satisfies TableInsert<"order_status_events">;

  const { error: eventError } = await supabase.from("order_status_events").insert(eventPayload);

  if (eventError) {
    throw new Error(`Unable to create initial tracking event: ${eventError.message}`);
  }

  const notificationId = await createAdminNotification({
    employeeId: parsed.employeeId,
    entityId: order.id,
    entityType: "order",
    linkPath: `/admin/orders/${order.id}`,
    message: parsed.workshopId
      ? `${parsed.productName} was created and assigned to a workshop.`
      : `${parsed.productName} was created and is waiting for workshop assignment.`,
    title: `${internalOrderNumber} created`,
    type: "order_created",
    workshopId: parsed.workshopId,
  });

  let emailResult:
    | {
        delivered: boolean;
        fallback: boolean;
        ok: boolean;
        reason?: string;
      }
    | undefined;
  const orderItemsForEmail = [
    {
      categoryName: parsed.productCategoryName,
      categorySlug: parsed.productCategorySlug,
      id: order.id,
      notes: parsed.notes.customerNotes,
      productId: parsed.productId,
      productImage: parsed.productImage,
      productName: parsed.productName,
      productSku: parsed.productSku,
      productSlug: parsed.productSlug,
      quantity: parsed.quantity,
      referenceImages: parsed.referenceImages,
      selectedOptions: parsed.selectedOptions,
    } satisfies OrderItemRecord,
  ];

  if (parsed.emailUpdatesEnabled && parsed.customerEmail) {
    emailResult = await dispatchCustomerOrderEmail({
      currency,
      customerEmail: parsed.customerEmail,
      customerName: parsed.customerName,
      customerNote: customerFacingNote,
      goldDetails: parsed.goldDetails,
      items: orderItemsForEmail,
      locale: customerLocale,
      measurements: parsed.measurements,
      notificationId,
      orderId: order.id,
      personalization: parsed.personalization,
      totalAmount: parsed.totalAmount,
      trackingNumber,
      type: "order_confirmation",
    });
  }

  return {
    emailResult,
    orderId: order.id,
    trackingNumber,
  };
}

export async function updateOrderWorkflow(
  viewer: AdminViewer,
  input: OrderWorkflowUpdatePayload,
  locale: AppLocale
) {
  const parsed = orderWorkflowUpdateSchema.parse({
    ...input,
    customerNote: normalizeOptionalText(input.customerNote),
    internalNote: normalizeOptionalText(input.internalNote),
  });
  const order = await getScopedOrderDetail(viewer, parsed.orderId);

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (viewer.role === "employee" && (parsed.workshopId || parsed.employeeId)) {
    throw new Error("ORDER_ASSIGNMENT_FORBIDDEN");
  }

  const nextWorkshopId = parsed.workshopId ?? order.workshopId ?? null;
  const workshopChanged = nextWorkshopId !== order.workshopId;
  const nextEmployeeId =
    parsed.employeeId ??
    (workshopChanged ? null : order.employeeId ?? null);

  if (!nextWorkshopId && nextEmployeeId) {
    throw new Error("WORKSHOP_REQUIRED_FOR_EMPLOYEE");
  }

  const supabase = createSupabaseAdminClient();
  let assignedEmployeeName = order.employeeName;
  let assignedWorkshopName = order.workshopName;

  if (nextWorkshopId && !canAccessWorkshop(viewer, nextWorkshopId)) {
    throw new Error("INVALID_WORKSHOP_SELECTION");
  }

  if (nextWorkshopId) {
    const { data: workshop, error: workshopError } = await supabase
      .from("workshops")
      .select("id, name")
      .eq("id", nextWorkshopId)
      .maybeSingle();

    if (workshopError || !workshop) {
      throw new Error("INVALID_WORKSHOP_SELECTION");
    }

    assignedWorkshopName = workshop.name;
  } else {
    assignedWorkshopName = "";
  }

  if (nextEmployeeId) {
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, full_name, workshop_id")
      .eq("id", nextEmployeeId)
      .maybeSingle();

    if (employeeError || !employee) {
      throw new Error("INVALID_EMPLOYEE_SELECTION");
    }

    if (!nextWorkshopId || employee.workshop_id !== nextWorkshopId) {
      throw new Error("INVALID_EMPLOYEE_WORKSHOP");
    }

    assignedEmployeeName = employee.full_name;
  } else {
    assignedEmployeeName = "";
  }

  const employeeChanged = nextEmployeeId !== order.employeeId;
  const customerLocale = order.customerLanguage ?? locale;
  const currentPublicStage = order.publicTrackingStage;
  const publicStageChanged = parsed.publicStage !== currentPublicStage;
  const statusChanged = parsed.status !== order.trackingStatus;
  const hasInternalNote = parsed.internalNote.length > 0;
  const hasCustomerNote = parsed.customerNote.length > 0;
  const publicEventStage = publicStageChanged
    ? parsed.publicStage
    : currentPublicStage;
  const publicEventStatus = publicEventStage
    ? getCanonicalTrackingStatusForPublicStage(publicEventStage)
    : parsed.status;
  const publicDescription = hasCustomerNote
    ? parsed.customerNote
    : getTrackingStatusNote(customerLocale, publicEventStage);

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      assigned_admin_id: viewer.role === "employee" ? undefined : viewer.id,
      employee_id: nextEmployeeId,
      notes: hasInternalNote ? parsed.internalNote : undefined,
      public_tracking_stage: publicStageChanged ? parsed.publicStage : undefined,
      status: trackingStatusToOrderStatus(parsed.status),
      tracking_status: parsed.status,
      workshop_id: nextWorkshopId,
    } satisfies TableUpdate<"orders">)
    .eq("id", parsed.orderId);

  if (orderError) {
    throw new Error(`Unable to update order: ${orderError.message}`);
  }

  if (hasInternalNote || workshopChanged || employeeChanged) {
    const internalSummary = [
      parsed.internalNote,
      workshopChanged
        ? `Workshop assignment: ${assignedWorkshopName || "unassigned"}`
        : "",
      employeeChanged
        ? `Employee assignment: ${assignedEmployeeName || "unassigned"}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { error: internalEventError } = await supabase
      .from("order_status_events")
      .insert({
        actor_name: viewer.name,
        created_by: viewer.id,
        description: internalSummary || "Order assignment updated.",
        is_public: false,
        notify_customer: false,
        order_id: parsed.orderId,
        status: parsed.status,
        title: fallbackTrackingTitle(parsed.status),
      } satisfies TableInsert<"order_status_events">);

    if (internalEventError) {
      throw new Error(`Unable to save internal order note: ${internalEventError.message}`);
    }
  }

  const shouldCreatePublicEvent = hasCustomerNote || publicStageChanged;
  const shouldSendCustomerEmail =
    publicStageChanged &&
    Boolean(parsed.publicStage) &&
    order.customerEmail.length > 0 &&
    order.emailUpdatesEnabled;

  if (shouldCreatePublicEvent) {
    const { error: publicEventError } = await supabase
      .from("order_status_events")
      .insert({
        actor_name: viewer.name,
        created_by: viewer.id,
        description: publicDescription,
        is_public: true,
        notify_customer: shouldSendCustomerEmail,
        order_id: parsed.orderId,
        status: publicEventStatus,
        title: fallbackTrackingTitle(publicEventStatus),
      } satisfies TableInsert<"order_status_events">);

    if (publicEventError) {
      throw new Error(`Unable to save customer-facing update: ${publicEventError.message}`);
    }
  }

  const notificationParts = [
    statusChanged ? `Status: ${fallbackTrackingTitle(parsed.status)}` : "",
    publicStageChanged && parsed.publicStage
      ? `Public stage: ${parsed.publicStage}`
      : "",
    workshopChanged
      ? `Workshop: ${assignedWorkshopName || "unassigned"}`
      : "",
    employeeChanged
      ? `Employee: ${assignedEmployeeName || "unassigned"}`
      : "",
    hasInternalNote ? parsed.internalNote : "",
  ].filter(Boolean);

  await createAdminNotification({
    employeeId: nextEmployeeId,
    entityId: parsed.orderId,
    entityType: "order",
    linkPath: `/admin/orders/${parsed.orderId}`,
    message:
      notificationParts.join(" | ") || "Order assignment and status updated.",
    title: `${order.internalOrderNumber} updated`,
    type: "order_updated",
    workshopId: nextWorkshopId,
  });

  let emailResult:
    | {
        delivered: boolean;
        fallback: boolean;
        ok: boolean;
        reason?: string;
      }
    | undefined;

  if (shouldSendCustomerEmail) {
    emailResult = await dispatchCustomerOrderEmail({
      currency: order.currency,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      customerNote: publicDescription,
      goldDetails: order.goldDetails,
      items: order.items,
      locale: customerLocale,
      measurements: order.measurements,
      orderId: order.id,
      personalization: order.personalization,
      publicStage: parsed.publicStage,
      totalAmount: order.totalAmount,
      trackingNumber: order.trackingNumber,
      type: "public_stage_update",
    });
  }

  return {
    emailResult,
    trackingNumber: order.trackingNumber,
  };
}

export async function getPublicTrackingOrder(
  trackingNumber: string
): Promise<PublicTrackingOrderRecord | null> {
  const supabase = createSupabaseAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("tracking_number", trackingNumber)
    .maybeSingle();

  if (error) {
    logAdminReadError("public tracking order", error.message);
    return null;
  }

  if (!order) {
    return null;
  }

  const [{ data: events, error: eventsError }, { data: tickets, error: ticketsError }] =
    await Promise.all([
      supabase
        .from("order_status_events")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("support_tickets")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false }),
    ]);

  if (eventsError) {
    logAdminReadError("public tracking events", eventsError.message);
    return null;
  }

  if (ticketsError) {
    logAdminReadError("public support tickets", ticketsError.message);
  }

  const trackingStatus = normalizeTrackingStatus(order.tracking_status);
  const customerLocale = normalizeLocale(
    getTextRecord(order.notes_json).customerLanguage
  );
  const publicTrackingStage = resolvePublicTrackingStage({
    publicTrackingStage: order.public_tracking_stage,
    trackingStatus,
  });
  const visibleEvents = (events ?? [])
    .map(mapOrderTrackingEvent)
    .filter((event) => event.isPublic);
  const fallbackNote = getTrackingStatusNote(customerLocale, publicTrackingStage);
  const trackingEvents =
    visibleEvents.length > 0
      ? visibleEvents
      : [
          {
            createdAt: order.updated_at,
            createdBy: "GoldHelwah Team",
            description: fallbackNote,
            id: `${order.id}-public-status`,
            isPublic: true,
            notifyCustomer: false,
            publicStage: publicTrackingStage,
            status: trackingStatus,
            title: fallbackTrackingTitle(trackingStatus),
          } satisfies OrderTrackingEventRecord,
        ];

  return {
    customerName: order.customer_name ?? "",
    latestCustomerNote:
      trackingEvents[trackingEvents.length - 1]?.description ?? fallbackNote,
    publicTrackingStage,
    supportTickets: (tickets ?? []).map(mapSupportTicket),
    trackingEvents,
    trackingNumber: order.tracking_number,
    trackingStatus,
  };
}

export async function createSupportTicketFromTracking(
  trackingNumber: string,
  input: SupportTicketInput
) {
  const parsed = supportTicketSchema.parse(input);
  const supabase = createSupabaseAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("tracking_number", trackingNumber)
    .maybeSingle();

  if (orderError || !order) {
    throw new Error("The requested order could not be found.");
  }

  const subject = `Support request for ${trackingNumber}`;
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      customer_email: parsed.customerEmail || order.customer_email || null,
      customer_name: parsed.customerName || order.customer_name || null,
      customer_phone: parsed.customerPhone || order.customer_phone || null,
      message: parsed.message,
      order_id: order.id,
      subject,
      tracking_number: trackingNumber,
    })
    .select("*")
    .single();

  if (ticketError) {
    throw new Error(`Unable to create support ticket: ${ticketError.message}`);
  }

  const notificationId = await createAdminNotification({
    employeeId: order.employee_id,
    entityId: ticket.id,
    entityType: "support_ticket",
    linkPath: `/admin/orders/${order.id}`,
    message: parsed.message,
    title: subject,
    type: "ticket_created",
    workshopId: order.workshop_id,
  });

  const adminRecipient = process.env.CONTACT_RECEIVER_EMAIL?.trim() ?? "";

  if (adminRecipient) {
    await sendTransactionalEmail({
      metadata: {
        kind: "support_ticket_created",
        trackingNumber,
      },
      notificationId,
      orderId: order.id,
      recipientEmail: adminRecipient,
      replyTo: parsed.customerEmail || order.customer_email || undefined,
      subject,
      supportTicketId: ticket.id,
      text: [
        `A new support ticket was submitted for order ${trackingNumber}.`,
        "",
        `Customer: ${parsed.customerName || order.customer_name || "-"}`,
        `Email: ${parsed.customerEmail || order.customer_email || "-"}`,
        `Phone: ${parsed.customerPhone || order.customer_phone || "-"}`,
        "",
        parsed.message,
      ].join("\n"),
    });
  }

  return {
    orderId: order.id,
    ticketId: ticket.id,
  };
}
