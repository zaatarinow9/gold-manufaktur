import "server-only";

import { z } from "zod";

import { assertEmployeeAssignedToOrder } from "@/lib/admin/access";
import type { AdminViewer } from "@/lib/db/adminScope";
import { createAdminNotification } from "@/lib/db/notifications";
import { getScopedOrderDetail } from "@/lib/db/orders";
import { getSiteBaseUrl } from "@/lib/db/siteSettings";
import { sendTransactionalEmail, type EmailDispatchResult } from "@/lib/email/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TableInsert, TableUpdate } from "@/lib/supabase/types";
import type { OrderAssignmentStatus } from "@/types/admin";

const assignOrderSchema = z.object({
  assignmentNote: z.string().trim().max(4000).optional().default(""),
  employeeId: z.string().uuid(),
  orderId: z.string().uuid(),
});

const employeeTaskSchema = z.object({
  employeeNote: z.string().trim().max(4000).optional().default(""),
  orderId: z.string().uuid(),
  status: z.enum(["assigned", "accepted", "in_progress", "waiting", "completed"]),
});

export type AssignOrderInput = z.infer<typeof assignOrderSchema>;
export type EmployeeTaskInput = z.infer<typeof employeeTaskSchema>;

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function buildTaskPath(orderId: string) {
  return `/admin/orders/${orderId}`;
}

function buildLocalizedTaskPath(orderId: string) {
  return `/de/admin/orders/${orderId}`;
}

function buildTaskUrl(orderId: string) {
  return `${getSiteBaseUrl()}${buildLocalizedTaskPath(orderId)}`;
}

function buildTaskLoginUrl(orderId: string) {
  const redirectPath = buildLocalizedTaskPath(orderId);
  const query = encodeURIComponent(redirectPath);
  return `${getSiteBaseUrl()}/de/admin/login?next=${query}`;
}

function buildAssignmentAuditDescription(input: {
  assignmentNote: string;
  employeeName: string;
  orderNumber: string;
  previousEmployeeName?: string;
  status: OrderAssignmentStatus;
}) {
  const lines = [
    input.previousEmployeeName
      ? `Auftrag ${input.orderNumber} neu zugewiesen an ${input.employeeName}.`
      : `Auftrag ${input.orderNumber} zugewiesen an ${input.employeeName}.`,
    `Status: ${input.status}`,
  ];

  if (input.previousEmployeeName) {
    lines.push(`Vorher: ${input.previousEmployeeName}`);
  }

  if (input.assignmentNote) {
    lines.push(`Hinweis: ${input.assignmentNote}`);
  }

  return lines.join("\n");
}

function buildEmployeeAssignmentEmail(input: {
  assignmentNote: string;
  assignedAt: string;
  employeeName: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  trackingNumber: string;
}) {
  const taskUrl = buildTaskUrl(input.orderId);
  const loginUrl = buildTaskLoginUrl(input.orderId);
  const assignedAt = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input.assignedAt));

  const subject = "Neuer Auftrag wurde Ihnen zugewiesen - Gold Helwah";
  const text = [
    `Guten Tag ${input.employeeName},`,
    "",
    "Ihnen wurde ein neuer Werkstattauftrag zugewiesen.",
    "",
    `Auftragsreferenz: ${input.orderNumber}`,
    `Tracking-Nummer: ${input.trackingNumber}`,
    `Produkt: ${input.productName}`,
    `Zugewiesen am: ${assignedAt}`,
    input.assignmentNote ? `Hinweis: ${input.assignmentNote}` : "",
    "",
    "Auftrag ansehen:",
    taskUrl,
    "",
    "Falls Sie sich erst anmelden muessen, verwenden Sie diesen Link:",
    loginUrl,
    "",
    "GoldHelwah GmbH",
  ]
    .filter(Boolean)
    .join("\n");
  const html = [
    "<div style=\"font-family:Arial,sans-serif;color:#111;line-height:1.6\">",
    `<p>Guten Tag ${input.employeeName},</p>`,
    "<p>Ihnen wurde ein neuer Werkstattauftrag zugewiesen.</p>",
    "<table style=\"border-collapse:collapse;margin:16px 0\">",
    `<tr><td style="padding:4px 12px 4px 0;font-weight:600">Auftragsreferenz</td><td>${input.orderNumber}</td></tr>`,
    `<tr><td style="padding:4px 12px 4px 0;font-weight:600">Tracking-Nummer</td><td>${input.trackingNumber}</td></tr>`,
    `<tr><td style="padding:4px 12px 4px 0;font-weight:600">Produkt</td><td>${input.productName}</td></tr>`,
    `<tr><td style="padding:4px 12px 4px 0;font-weight:600">Zugewiesen am</td><td>${assignedAt}</td></tr>`,
    input.assignmentNote
      ? `<tr><td style="padding:4px 12px 4px 0;font-weight:600">Hinweis</td><td>${input.assignmentNote}</td></tr>`
      : "",
    "</table>",
    `<p><a href="${taskUrl}" style="display:inline-block;background:#c49a52;color:#111;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Auftrag ansehen</a></p>`,
    `<p style="font-size:13px;color:#555">Falls Sie sich erst anmelden muessen, verwenden Sie diesen Link: <a href="${loginUrl}">${loginUrl}</a></p>`,
    "<p>GoldHelwah GmbH</p>",
    "</div>",
  ]
    .filter(Boolean)
    .join("");

  return {
    html,
    subject,
    text,
  };
}

async function sendEmployeeAssignmentEmail(input: {
  assignmentNote: string;
  assignedAt: string;
  employeeEmail: string;
  employeeName: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  trackingNumber: string;
}) {
  const email = buildEmployeeAssignmentEmail(input);

  return sendTransactionalEmail({
    html: email.html,
    metadata: {
      kind: "worker_order_assigned",
      trackingNumber: input.trackingNumber,
    },
    orderId: input.orderId,
    recipientEmail: input.employeeEmail,
    subject: email.subject,
    text: email.text,
  });
}

export async function assignOrderToEmployee(
  viewer: AdminViewer,
  input: AssignOrderInput
) {
  const parsed = assignOrderSchema.parse(input);
  const order = await getScopedOrderDetail(viewer, parsed.orderId);

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const supabase = createSupabaseAdminClient();
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("email, full_name, id, is_active, workshop_id")
    .eq("id", parsed.employeeId)
    .maybeSingle();

  if (employeeError || !employee || !employee.is_active) {
    throw new Error("INVALID_EMPLOYEE_SELECTION");
  }

  const assignedAt = new Date().toISOString();
  const assignmentNote = normalizeText(parsed.assignmentNote);
  const employeeChanged = order.employeeId !== employee.id;
  const previousEmployeeName = order.employeeName || undefined;
  const productName = order.items[0]?.productName || order.previewProductName || order.id;
  const nextStatus: OrderAssignmentStatus = employeeChanged
    ? "assigned"
    : order.assignmentStatus;
  const payload: TableUpdate<"orders"> = {
    assigned_admin_id: viewer.id,
    assigned_at: assignedAt,
    assigned_worker_email: normalizeText(employee.email) || null,
    assignment_note: assignmentNote || null,
    assignment_status: nextStatus,
    employee_id: employee.id,
    employee_note: employeeChanged ? null : order.employeeNote || null,
    workshop_id: employee.workshop_id ?? order.workshopId,
  };

  const { error: orderError } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", parsed.orderId);

  if (orderError) {
    throw new Error(`Unable to save assignment: ${orderError.message}`);
  }

  const eventDescription = buildAssignmentAuditDescription({
    assignmentNote,
    employeeName: employee.full_name,
    orderNumber: order.internalOrderNumber,
    previousEmployeeName: employeeChanged ? previousEmployeeName : undefined,
    status: nextStatus,
  });

  const { error: eventError } = await supabase.from("order_status_events").insert({
    actor_name: viewer.name,
    created_by: viewer.id,
    description: eventDescription,
    is_public: false,
    notify_customer: false,
    order_id: parsed.orderId,
    status: order.trackingStatus,
    title: employeeChanged ? "Assignment updated" : "Assignment note updated",
  } satisfies TableInsert<"order_status_events">);

  if (eventError) {
    throw new Error(`Unable to log assignment change: ${eventError.message}`);
  }

  await createAdminNotification({
    employeeId: employee.id,
    entityId: order.id,
    entityType: "order",
    linkPath: buildTaskPath(order.id),
    message: employeeChanged
      ? `${order.internalOrderNumber} wurde ${employee.full_name} zugewiesen.`
      : `${order.internalOrderNumber} wurde aktualisiert.`,
    title: employeeChanged ? "Auftrag zugewiesen" : "Zuweisung aktualisiert",
    type: "order_updated",
    workshopId: employee.workshop_id ?? order.workshopId,
  });

  let emailResult: EmailDispatchResult | undefined;

  if (employeeChanged && normalizeText(employee.email)) {
    emailResult = await sendEmployeeAssignmentEmail({
      assignedAt,
      assignmentNote,
      employeeEmail: employee.email ?? "",
      employeeName: employee.full_name,
      orderId: order.id,
      orderNumber: order.internalOrderNumber,
      productName,
      trackingNumber: order.trackingNumber,
    });
  }

  return {
    emailResult,
    trackingNumber: order.trackingNumber,
  };
}

export async function updateMyAssignmentStatus(
  viewer: AdminViewer,
  input: EmployeeTaskInput
) {
  const parsed = employeeTaskSchema.parse(input);
  await assertEmployeeAssignedToOrder(viewer, parsed.orderId);
  const linkedEmployeeId = viewer.linkedEmployeeId;

  if (!linkedEmployeeId) {
    throw new Error("ORDER_ASSIGNMENT_FORBIDDEN");
  }

  const order = await getScopedOrderDetail(viewer, parsed.orderId);

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const supabase = createSupabaseAdminClient();
  const employeeNote = normalizeText(parsed.employeeNote);
  const payload: TableUpdate<"orders"> = {
    assignment_status: parsed.status,
    employee_note: employeeNote || null,
  };

  const { error: updateError } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", parsed.orderId)
    .eq("employee_id", linkedEmployeeId);

  if (updateError) {
    throw new Error(`Unable to update task status: ${updateError.message}`);
  }

  const noteDescription = [
    `Aufgabenstatus: ${parsed.status}`,
    employeeNote ? `Mitarbeiterhinweis: ${employeeNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { error: eventError } = await supabase.from("order_status_events").insert({
    actor_name: viewer.name,
    created_by: viewer.id,
    description: noteDescription,
    is_public: false,
    notify_customer: false,
    order_id: parsed.orderId,
    status: order.trackingStatus,
    title: "Task progress updated",
  } satisfies TableInsert<"order_status_events">);

  if (eventError) {
    throw new Error(`Unable to log employee progress: ${eventError.message}`);
  }

  await createAdminNotification({
    employeeId: linkedEmployeeId,
    entityId: parsed.orderId,
    entityType: "order",
    linkPath: buildTaskPath(parsed.orderId),
    message: `${order.internalOrderNumber}: ${parsed.status}`,
    title: "Aufgabenstatus aktualisiert",
    type: "order_updated",
    workshopId: order.workshopId,
  });

  return {
    trackingNumber: order.trackingNumber,
  };
}
