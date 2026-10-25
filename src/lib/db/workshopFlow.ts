import "server-only";

import { z } from "zod";

import type { AppLocale } from "@/i18n/routing";
import { StaffAccountError } from "@/lib/admin/staffAuth";
import { createRequiredAuditLog } from "@/lib/db/auditLogs";
import type { AdminViewer } from "@/lib/db/adminScope";
import { createEmployeeWithAccount, sendEmployeeInvite, setEmployeeAccountActive } from "@/lib/db/employeeAccounts";
import { deleteEmployeeRecord } from "@/lib/db/employees";
import { createAdminNotification } from "@/lib/db/notifications";
import { getScopedOrderDetail } from "@/lib/db/orders";
import { getSiteBaseUrl } from "@/lib/db/siteSettings";
import { postSystemMessage } from "@/lib/db/staffMessages";
import { loadSignedInProfiles } from "@/lib/db/workshops";
import { sendTransactionalEmail } from "@/lib/email/service";
import { buildTaskAlertEmail, buildWorkshopOrderEmail } from "@/lib/email/staffEmails";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * The workshop chain of command:
 *   head office → workshop manager → workshop employee.
 * Head office creates workshops and names a manager, the manager builds
 * their own team, and every order travels down the same chain.
 */

const personSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  fullName: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(80).optional().default(""),
});

export const workshopWithManagerSchema = z.object({
  description: z.string().trim().max(4000).optional().default(""),
  location: z.string().trim().max(255).optional().default(""),
  managerEmail: z.string().trim().toLowerCase().email(),
  managerName: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(80).optional().default(""),
});

export type WorkshopWithManagerInput = z.input<typeof workshopWithManagerSchema>;
export type TeamMemberInput = z.input<typeof personSchema>;

export type TeamMember = {
  email: string;
  hasSignedIn: boolean;
  id: string;
  isActive: boolean;
  isManager: boolean;
  name: string;
  openTasks: number;
  phone: string;
};

/** Head office acts with full rights inside these helpers once checked. */
function trustedActor(viewer: AdminViewer) {
  return { email: viewer.email, role: "super_admin" as const };
}

function adminOrderUrl(locale: AppLocale, orderId: string) {
  const next = encodeURIComponent(`/${locale}/admin/orders/${orderId}`);
  return `${getSiteBaseUrl()}/${locale}/admin/login?next=${next}`;
}

function emptyMemberValues(workshopId: string, person: z.infer<typeof personSchema>) {
  return {
    attendanceStatus: "present" as const,
    email: person.email,
    fullName: person.fullName,
    isActive: true,
    notes: "",
    phone: person.phone ?? "",
    role: "employee" as const,
    shiftLabel: "",
    workshopId,
  };
}

async function getWorkshopRow(workshopId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("workshops").select("*").eq("id", workshopId).maybeSingle();
  if (error || !data) throw new Error("WORKSHOP_NOT_FOUND");
  return data;
}

async function getManagerOf(workshopId: string) {
  const supabase = createSupabaseAdminClient();
  const workshop = await getWorkshopRow(workshopId);
  if (!workshop.manager_employee_id) return { manager: null, workshop };
  const { data: manager } = await supabase
    .from("employees")
    .select("id, full_name, email, profile_id")
    .eq("id", workshop.manager_employee_id)
    .maybeSingle();
  return { manager, workshop };
}

async function getHeadOfficeProfileIds() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "super_admin")
    .eq("is_active", true)
    .is("deleted_at", null);
  return (data ?? []).map((row) => row.id);
}

export async function notifyHeadOffice(input: { linkPath: string; message: string; orderId?: string | null; title: string; workshopId?: string | null }) {
  const ids = await getHeadOfficeProfileIds();
  await Promise.all(
    ids.map((profileId) =>
      createAdminNotification({
        entityId: input.orderId ?? null,
        entityType: input.orderId ? "order" : "workshop",
        linkPath: input.linkPath,
        message: input.message,
        profileId,
        title: input.title,
        type: "order_updated",
        workshopId: input.workshopId ?? null,
      })
    )
  );
}

function assertHeadOffice(viewer: AdminViewer) {
  if (viewer.role !== "super_admin") throw new Error("PERMISSION_DENIED");
}

function assertManager(viewer: AdminViewer) {
  if (viewer.role !== "employee" || !viewer.managedWorkshopId) throw new Error("PERMISSION_DENIED");
  return viewer.managedWorkshopId;
}

function staffErrorCode(error: unknown) {
  if (error instanceof StaffAccountError) {
    if (error.code === "duplicate_email" || error.code === "link_in_use") return "EMAIL_IN_USE";
    if (error.code === "account_role_conflict") return "EMAIL_IS_OFFICE_ACCOUNT";
  }
  return error instanceof Error ? error.message : "UNKNOWN";
}

/* ------------------------------------------------------------------ */
/* Head office: workshops and their managers                          */
/* ------------------------------------------------------------------ */

export async function createWorkshopWithManager(viewer: AdminViewer, locale: AppLocale, input: WorkshopWithManagerInput) {
  assertHeadOffice(viewer);
  const parsed = workshopWithManagerSchema.parse(input);
  const supabase = createSupabaseAdminClient();
  const { data: workshop, error } = await supabase
    .from("workshops")
    .insert({
      description: parsed.description || null,
      is_active: true,
      location: parsed.location || null,
      name: parsed.name,
      phone: parsed.phone || null,
    })
    .select("id, name")
    .single();
  if (error || !workshop) throw new Error("WORKSHOP_SAVE_FAILED");

  try {
    const result = await appointManager(viewer, locale, workshop.id, workshop.name, {
      email: parsed.managerEmail,
      fullName: parsed.managerName,
      phone: "",
    });
    await createRequiredAuditLog({
      action: "workshop_created_with_manager",
      actorEmail: viewer.email,
      metadata: { managerEmail: parsed.managerEmail, workshopId: workshop.id, workshopName: workshop.name },
    });
    return { emailStatus: result.emailStatus, workshopId: workshop.id };
  } catch (appointError) {
    await supabase.from("workshops").delete().eq("id", workshop.id);
    throw new Error(staffErrorCode(appointError));
  }
}

async function appointManager(
  viewer: AdminViewer,
  locale: AppLocale,
  workshopId: string,
  workshopName: string,
  person: z.infer<typeof personSchema>
) {
  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("employees")
    .select("id, workshop_id, profile_id, is_active")
    .eq("email", person.email)
    .maybeSingle();

  let employeeId: string;
  let emailStatus: string = "sent";

  if (existing && existing.workshop_id === workshopId) {
    // Promote a member of this workshop.
    employeeId = existing.id;
    const { error } = await supabase
      .from("employees")
      .update({ full_name: person.fullName, is_active: true, workshop_role: "workshop_manager" })
      .eq("id", existing.id);
    if (error) throw new Error("MANAGER_SAVE_FAILED");
    if (!existing.profile_id) {
      const invite = await sendEmployeeInvite({
        actor: trustedActor(viewer),
        emailContext: { roleLabel: "manager", workshopName },
        employeeId,
        locale,
      });
      emailStatus = invite.emailResult.status;
    }
  } else if (existing) {
    throw new StaffAccountError("duplicate_email");
  } else {
    const created = await createEmployeeWithAccount({
      actor: trustedActor(viewer),
      emailContext: { roleLabel: "manager", workshopName },
      locale,
      values: emptyMemberValues(workshopId, person),
      workshopRole: "workshop_manager",
    });
    employeeId = created.employeeId;
    emailStatus = created.emailResult.status;
  }

  const { error: pointerError } = await supabase
    .from("workshops")
    .update({ manager_employee_id: employeeId })
    .eq("id", workshopId);
  if (pointerError) throw new Error("MANAGER_SAVE_FAILED");

  return { emailStatus, employeeId };
}

export async function replaceWorkshopManager(
  viewer: AdminViewer,
  locale: AppLocale,
  workshopId: string,
  input: { managerEmail: string; managerName: string }
) {
  assertHeadOffice(viewer);
  const person = personSchema.parse({ email: input.managerEmail, fullName: input.managerName });
  const workshop = await getWorkshopRow(workshopId);
  try {
    const result = await appointManager(viewer, locale, workshopId, workshop.name, person);
    await createRequiredAuditLog({
      action: "workshop_manager_changed",
      actorEmail: viewer.email,
      metadata: { managerEmail: person.email, workshopId },
    });
    return result;
  } catch (error) {
    throw new Error(staffErrorCode(error));
  }
}

export async function resendManagerInvite(viewer: AdminViewer, locale: AppLocale, workshopId: string) {
  assertHeadOffice(viewer);
  const { manager, workshop } = await getManagerOf(workshopId);
  if (!manager) throw new Error("WORKSHOP_HAS_NO_MANAGER");
  const result = await sendEmployeeInvite({
    actor: trustedActor(viewer),
    emailContext: { roleLabel: "manager", workshopName: workshop.name },
    employeeId: manager.id,
    locale,
  });
  return result.emailResult.status;
}

/* ------------------------------------------------------------------ */
/* Workshop manager: their own team                                   */
/* ------------------------------------------------------------------ */

export async function getWorkshopTeam(workshopId: string): Promise<TeamMember[]> {
  const supabase = createSupabaseAdminClient();
  const [{ data: workshop }, { data: rows }, { data: orders }] = await Promise.all([
    supabase.from("workshops").select("manager_employee_id").eq("id", workshopId).maybeSingle(),
    supabase.from("employees").select("*").eq("workshop_id", workshopId).order("full_name"),
    supabase
      .from("orders")
      .select("employee_id, assignment_status, status")
      .eq("workshop_id", workshopId)
      .not("employee_id", "is", null),
  ]);
  const members = rows ?? [];
  const signedIn = await loadSignedInProfiles(members.map((member) => member.profile_id).filter((id): id is string => Boolean(id)));
  return members
    .map((member) => ({
      email: member.email ?? "",
      hasSignedIn: Boolean(member.profile_id && signedIn.has(member.profile_id)),
      id: member.id,
      isActive: member.is_active,
      isManager: member.id === workshop?.manager_employee_id,
      name: member.full_name,
      openTasks: (orders ?? []).filter(
        (order) =>
          order.employee_id === member.id &&
          !["completed", "shipped", "declined", "returned"].includes(order.assignment_status) &&
          !["delivered", "cancelled", "archived"].includes(order.status)
      ).length,
      phone: member.phone ?? "",
    }))
    .sort((left, right) => Number(right.isManager) - Number(left.isManager));
}

async function getMemberOfManagedWorkshop(viewer: AdminViewer, employeeId: string) {
  const workshopId = assertManager(viewer);
  const supabase = createSupabaseAdminClient();
  const { data: member } = await supabase
    .from("employees")
    .select("id, full_name, workshop_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (!member || member.workshop_id !== workshopId) throw new Error("PERMISSION_DENIED");
  if (member.id === viewer.linkedEmployeeId) throw new Error("CANNOT_CHANGE_SELF");
  return { member, workshopId };
}

export async function inviteTeamMember(viewer: AdminViewer, locale: AppLocale, input: TeamMemberInput) {
  const workshopId = assertManager(viewer);
  const person = personSchema.parse(input);
  const workshop = await getWorkshopRow(workshopId);
  try {
    const created = await createEmployeeWithAccount({
      actor: trustedActor(viewer),
      emailContext: { roleLabel: "employee", workshopName: workshop.name },
      locale,
      values: emptyMemberValues(workshopId, person),
      workshopRole: "workshop_employee",
    });
    await createRequiredAuditLog({
      action: "workshop_member_invited",
      actorEmail: viewer.email,
      metadata: { email: person.email, employeeId: created.employeeId, workshopId },
    });
    return created.emailResult.status;
  } catch (error) {
    throw new Error(staffErrorCode(error));
  }
}

export async function resendTeamInvite(viewer: AdminViewer, locale: AppLocale, employeeId: string) {
  const { workshopId } = await getMemberOfManagedWorkshop(viewer, employeeId);
  const workshop = await getWorkshopRow(workshopId);
  const result = await sendEmployeeInvite({
    actor: trustedActor(viewer),
    emailContext: { roleLabel: "employee", workshopName: workshop.name },
    employeeId,
    locale,
  });
  return result.emailResult.status;
}

export async function setTeamMemberActive(viewer: AdminViewer, employeeId: string, isActive: boolean) {
  await getMemberOfManagedWorkshop(viewer, employeeId);
  await setEmployeeAccountActive({ actor: trustedActor(viewer), employeeId, isActive });
}

export async function removeTeamMember(viewer: AdminViewer, employeeId: string) {
  const { member, workshopId } = await getMemberOfManagedWorkshop(viewer, employeeId);
  await deleteEmployeeRecord(employeeId);
  await createRequiredAuditLog({
    action: "workshop_member_removed",
    actorEmail: viewer.email,
    metadata: { employeeId, employeeName: member.full_name, workshopId },
  });
}

/* ------------------------------------------------------------------ */
/* Orders down the chain                                              */
/* ------------------------------------------------------------------ */

export async function sendOrderToWorkshop(
  viewer: AdminViewer,
  locale: AppLocale,
  input: { note?: string; orderId: string; workshopId: string }
) {
  if (!["super_admin", "admin", "customer_service"].includes(viewer.role)) throw new Error("PERMISSION_DENIED");
  const note = input.note?.trim().slice(0, 2000) ?? "";
  const order = await getScopedOrderDetail(viewer, input.orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const { manager, workshop } = await getManagerOf(input.workshopId);
  if (!workshop.is_active) throw new Error("WORKSHOP_INACTIVE");

  const supabase = createSupabaseAdminClient();
  const changed = order.workshopId !== workshop.id;
  const { error } = await supabase
    .from("orders")
    .update({
      status: "sent_to_workshop",
      tracking_status: order.trackingStatus === "created" ? "sent_to_workshop" : order.trackingStatus,
      workshop_id: workshop.id,
    })
    .eq("id", order.id);
  if (error) throw new Error("ORDER_SEND_FAILED");

  await supabase.from("order_status_events").insert({
    actor_name: viewer.name,
    created_by: viewer.id,
    description: note || null,
    is_public: false,
    notify_customer: false,
    order_id: order.id,
    status: order.trackingStatus === "created" ? "sent_to_workshop" : order.trackingStatus,
    title: changed ? `Sent to ${workshop.name}` : `Reminder to ${workshop.name}`,
  });

  if (note) {
    await postSystemMessage({
      authorKind: "admin",
      authorName: viewer.name,
      authorProfileId: viewer.id,
      body: note,
      channel: "management",
      orderId: order.id,
      workshopId: workshop.id,
    });
  }

  let emailStatus: string | null = null;
  if (manager?.profile_id) {
    await createAdminNotification({
      entityId: order.id,
      entityType: "order",
      linkPath: `/admin/orders/${order.id}`,
      message: `${order.internalOrderNumber} · ${order.items[0]?.productName || order.previewProductName}`,
      metadata: { kind: "workshop_order_received" },
      profileId: manager.profile_id,
      title: "workshop_order_received",
      type: "order_updated",
      workshopId: workshop.id,
    });
  }
  if (manager?.email) {
    const email = await buildWorkshopOrderEmail({
      locale,
      note,
      order,
      recipientName: manager.full_name,
      url: adminOrderUrl(locale, order.id),
      workshopName: workshop.name,
    });
    const result = await sendTransactionalEmail({
      ...email,
      metadata: { kind: "workshop_order_sent", workshopId: workshop.id },
      orderId: order.id,
      recipientEmail: manager.email,
    });
    emailStatus = result.status;
  }

  await createRequiredAuditLog({
    action: "order_sent_to_workshop",
    actorEmail: viewer.email,
    metadata: { orderId: order.id, workshopId: workshop.id },
  });

  return { emailStatus, hasManager: Boolean(manager), workshopName: workshop.name };
}

/** Called after an employee changes their task status. */
export async function notifyChainAboutTask(input: {
  employeeName: string;
  locale: AppLocale;
  note: string;
  orderId: string;
  orderNumber: string;
  status: string;
  workshopId: string | null;
}) {
  if (!input.workshopId) return;
  const { manager } = await getManagerOf(input.workshopId).catch(() => ({ manager: null }));
  const linkPath = `/admin/orders/${input.orderId}`;
  const message = [input.employeeName, input.orderNumber, input.note].filter(Boolean).join(" · ");

  if (manager?.profile_id) {
    await createAdminNotification({
      entityId: input.orderId,
      entityType: "order",
      linkPath,
      message,
      metadata: { employee: input.employeeName, kind: "task_status", status: input.status },
      profileId: manager.profile_id,
      title: `task_status:${input.status}`,
      type: "order_updated",
      workshopId: input.workshopId,
    });
  }

  if ((input.status === "declined" || input.status === "problem") && manager?.email) {
    const email = await buildTaskAlertEmail({
      employeeName: input.employeeName,
      locale: input.locale,
      note: input.note,
      orderNumber: input.orderNumber,
      recipientName: manager.full_name,
      status: input.status,
      url: adminOrderUrl(input.locale, input.orderId),
    });
    await sendTransactionalEmail({
      ...email,
      metadata: { kind: "task_alert", status: input.status },
      orderId: input.orderId,
      recipientEmail: manager.email,
    });
  }

  if (input.status === "completed" || input.status === "shipped") {
    await notifyHeadOffice({
      linkPath,
      message,
      orderId: input.orderId,
      title: `task_status:${input.status}`,
      workshopId: input.workshopId,
    });
  }
}
