import "server-only";

import { z } from "zod";

import { assertEmployeeAssignedToOrder } from "@/lib/admin/access";
import { createRequiredAuditLog } from "@/lib/db/auditLogs";
import type { AdminViewer } from "@/lib/db/adminScope";
import { createAdminNotification } from "@/lib/db/notifications";
import { getScopedOrderDetail } from "@/lib/db/orders";
import { getSiteBaseUrl } from "@/lib/db/siteSettings";
import { sendTransactionalEmail, type EmailDispatchResult } from "@/lib/email/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TableInsert, TableUpdate } from "@/lib/supabase/types";
import type { AppLocale } from "@/i18n/routing";
import { employeeTaskStatusValues, statusesNeedingNote } from "@/lib/admin/assignmentStatus";
import { notifyChainAboutTask } from "@/lib/db/workshopFlow";
import { buildEmployeeTaskEmail } from "@/lib/email/staffEmails";
import type { OrderAssignmentStatus, WorkshopOrderStatus } from "@/types/admin";

const assignOrderSchema = z.object({
  assignmentNote: z.string().trim().max(4000).optional().default(""),
  employeeId: z.string().uuid(),
  orderId: z.string().uuid(),
});

const employeeTaskSchema = z.object({
  employeeNote: z.string().trim().max(4000).optional().default(""),
  orderId: z.string().uuid(),
  status: z.enum(employeeTaskStatusValues),
});

export type AssignOrderInput = z.infer<typeof assignOrderSchema>;
export type EmployeeTaskInput = z.infer<typeof employeeTaskSchema>;

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function buildTaskPath(orderId: string) {
  return `/admin/orders/${orderId}`;
}

function buildTaskLoginUrl(locale: AppLocale, orderId: string) {
  const next = encodeURIComponent(`/${locale}/admin/orders/${orderId}`);
  return `${getSiteBaseUrl()}/${locale}/admin/login?next=${next}`;
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

export async function assignOrderToEmployee(
  viewer: AdminViewer,
  input: AssignOrderInput,
  locale: AppLocale = "de"
) {
  const parsed = assignOrderSchema.parse(input);
  const order = await getScopedOrderDetail(viewer, parsed.orderId);

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const supabase = createSupabaseAdminClient();
  if (!order.workshopId) {
    throw new Error("ORDER_WORKSHOP_REQUIRED");
  }

  if (viewer.role === "employee") {
    if (!viewer.linkedEmployeeId) {
      throw new Error("ORDER_ASSIGNMENT_FORBIDDEN");
    }
    const { data: workshop, error: workshopError } = await supabase
      .from("workshops")
      .select("manager_employee_id")
      .eq("id", order.workshopId)
      .maybeSingle();

    if (workshopError || workshop?.manager_employee_id !== viewer.linkedEmployeeId) {
      throw new Error("ORDER_ASSIGNMENT_FORBIDDEN");
    }
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("email, full_name, id, is_active, profile_id, workshop_id")
    .eq("id", parsed.employeeId)
    .maybeSingle();

  if (employeeError || !employee || !employee.is_active) {
    throw new Error("INVALID_EMPLOYEE_SELECTION");
  }

  if (employee.workshop_id !== order.workshopId) {
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
    status: employeeChanged && ["draft", "sent_to_workshop", "accepted"].includes(order.status) ? "assigned" : order.status,
    workshop_id: order.workshopId,
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

  await createRequiredAuditLog({
    action: employeeChanged
      ? previousEmployeeName
        ? "order_reassigned_to_employee"
        : "order_assigned_to_employee"
      : "order_assignment_updated",
    actorEmail: viewer.email,
    metadata: {
      employeeId: employee.id,
      orderId: order.id,
      workshopId: order.workshopId,
    },
  });

  if (employeeChanged && employee.profile_id) {
    await createAdminNotification({
      entityId: order.id,
      entityType: "order",
      linkPath: buildTaskPath(order.id),
      message: `${order.internalOrderNumber} · ${productName}`,
      profileId: employee.profile_id,
      title: "task_assigned",
      type: "order_updated",
      workshopId: employee.workshop_id ?? order.workshopId,
    });
  }

  let emailResult: EmailDispatchResult | undefined;

  if (employeeChanged && normalizeText(employee.email)) {
    const email = await buildEmployeeTaskEmail({
      locale,
      managerName: viewer.name,
      note: assignmentNote,
      order,
      recipientName: employee.full_name,
      url: buildTaskLoginUrl(locale, order.id),
    });
    emailResult = await sendTransactionalEmail({
      ...email,
      metadata: { kind: "worker_order_assigned", trackingNumber: order.trackingNumber },
      orderId: order.id,
      recipientEmail: employee.email ?? "",
    });
  }

  return {
    emailResult,
    trackingNumber: order.trackingNumber,
  };
}

/** How an employee's task state moves the order along for head office. */
const orderStatusForTask: Partial<Record<OrderAssignmentStatus, WorkshopOrderStatus>> = {
  accepted: "accepted",
  completed: "ready",
  in_progress: "in_production",
  shipped: "delivered",
};

export async function updateMyAssignmentStatus(
  viewer: AdminViewer,
  input: EmployeeTaskInput,
  locale: AppLocale = "de"
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

  const employeeNote = normalizeText(parsed.employeeNote);
  if (statusesNeedingNote.includes(parsed.status) && !employeeNote) {
    throw new Error("TASK_NOTE_REQUIRED");
  }

  const supabase = createSupabaseAdminClient();
  const nextOrderStatus = orderStatusForTask[parsed.status];
  const payload: TableUpdate<"orders"> = {
    assignment_status: parsed.status,
    employee_note: employeeNote || null,
    ...(nextOrderStatus && !["cancelled", "archived"].includes(order.status) ? { status: nextOrderStatus } : {}),
  };

  const { error: updateError } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", parsed.orderId)
    .eq("employee_id", linkedEmployeeId);

  if (updateError) {
    throw new Error(`Unable to update task status: ${updateError.message}`);
  }

  const { error: eventError } = await supabase.from("order_status_events").insert({
    actor_name: viewer.name,
    created_by: viewer.id,
    description: [`Aufgabenstatus: ${parsed.status}`, employeeNote ? `Hinweis: ${employeeNote}` : ""].filter(Boolean).join("\n"),
    is_public: false,
    notify_customer: false,
    order_id: parsed.orderId,
    status: order.trackingStatus,
    title: "Task progress updated",
  } satisfies TableInsert<"order_status_events">);

  if (eventError) {
    throw new Error(`Unable to log employee progress: ${eventError.message}`);
  }

  if (parsed.status !== order.assignmentStatus || employeeNote !== order.employeeNote) {
    await notifyChainAboutTask({
      employeeName: viewer.name,
      locale,
      note: employeeNote,
      orderId: order.id,
      orderNumber: order.internalOrderNumber,
      status: parsed.status,
      workshopId: order.workshopId,
    });
  }

  return {
    trackingNumber: order.trackingNumber,
  };
}
