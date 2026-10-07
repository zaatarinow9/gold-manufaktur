"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { routing, type AppLocale } from "@/i18n/routing";
import {
  getOrderWorkflowCopy,
  getSafeActionErrorMessage,
} from "@/lib/admin/orderWorkflow";
import { requireAdminAccess } from "@/lib/admin/auth";
import { createRequiredAuditLog } from "@/lib/db/auditLogs";
import {
  getAdminDecoyUnavailableMessage,
  isAdminDecoyEnabled,
} from "@/lib/db/adminDecoy";
import {
  createWorkshop,
  permanentlyDeleteEmptyWorkshop,
  setWorkshopActive,
  updateWorkshop,
  type WorkshopInput,
  type WorkshopUpdateInput,
} from "@/lib/db/workshops";
import { sendEmployeeInvite } from "@/lib/db/employeeAccounts";
import { getAuthUserById } from "@/lib/admin/staffAuth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const workshopMembershipSchema = z.object({
  employeeId: z.string().uuid(),
  workshopId: z.string().uuid(),
});

function getWorkshopMutationError(locale: AppLocale, error: unknown, fallback: string) {
  if (error instanceof Error && error.message.includes("CURRENT_WORKSHOP_MANAGER_MOVE_FORBIDDEN")) {
    return locale === "ar"
      ? "لا يمكن نقل مدير الورشة الحالي. عيّن مديراً بديلاً أو أزل تعيينه أولاً."
      : "Die aktuelle Werkstattleitung kann erst nach Ersatz oder Aufhebung der Leitung verschoben werden.";
  }
  return getSafeActionErrorMessage(error, fallback);
}

function revalidateWorkshopViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/workshops`);
    revalidatePath(`/${locale}/admin/workshop-orders`);
    revalidatePath(`/${locale}/admin/employees`);
    revalidatePath(`/${locale}/admin/orders`);
  });
}

export async function saveWorkshopAction(
  locale: AppLocale,
  input: WorkshopInput | WorkshopUpdateInput
) {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated") {
    return {
      message: t("common.noAccessText"),
      ok: false as const,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false as const,
    };
  }

  try {
    if ("id" in input && typeof input.id === "string") {
      await updateWorkshop(input as WorkshopUpdateInput);
    } else {
      await createWorkshop(input as WorkshopInput);
    }

    revalidateWorkshopViews();

    return {
      message: t("common.mockSubmit"),
      ok: true as const,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false as const,
    };
  }
}

export async function toggleWorkshopActiveAction(
  locale: AppLocale,
  workshopId: string,
  isActive: boolean
) {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const access = await requireAdminAccess(locale, ["super_admin"]);

  if (access.state !== "authenticated") {
    return {
      message: t("common.noAccessText"),
      ok: false as const,
    };
  }

  if (await isAdminDecoyEnabled()) {
    return {
      message: getAdminDecoyUnavailableMessage(locale),
      ok: false as const,
    };
  }

  try {
    await setWorkshopActive(workshopId, isActive);
    revalidateWorkshopViews();

    return {
      message: t("common.mockSubmit"),
      ok: true as const,
    };
  } catch (error) {
    return {
      message: getSafeActionErrorMessage(error, copy.formErrorFallback),
      ok: false as const,
    };
  }
}

function workshopActionMessage(locale: AppLocale, code: string) {
  const ar = locale === "ar";
  const values: Record<string, [string, string]> = {
    INVITE_SENT: ["تم إرسال الدعوة.", "Einladung wurde versendet."],
    MANAGER_ACCOUNT_REQUIRED: ["أرسل دعوة للحساب أولاً ثم عيّن مدير الورشة بعد تفعيل الحساب.", "Senden Sie zuerst eine Einladung und ernennen Sie die Werkstattleitung nach der Kontoaktivierung."],
    WORKSHOP_NOT_EMPTY: ["لا يمكن حذف الورشة نهائيًا قبل نقل الموظفين وإزالة الطلبات المرتبطة بها.", "Die Werkstatt kann erst endgültig gelöscht werden, wenn Mitarbeitende und zugeordnete Aufträge entfernt wurden."],
    WORKSHOP_DELETED: ["تم حذف الورشة نهائيًا.", "Die Werkstatt wurde endgültig gelöscht."],
    PERMISSION_DENIED: ["ليس لديك صلاحية للوصول", "Sie haben keine Berechtigung."],
  };
  return values[code]?.[ar ? 0 : 1] ?? (ar ? "تعذر إتمام العملية." : "Die Aktion konnte nicht abgeschlossen werden.");
}

export async function assignWorkshopManagerAction(
  locale: AppLocale,
  input: z.infer<typeof workshopMembershipSchema>
) {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin"]);
  if (access.state !== "authenticated" || !access.user) return { message: t("common.noAccessText"), ok: false as const };
  if (await isAdminDecoyEnabled()) return { message: getAdminDecoyUnavailableMessage(locale), ok: false as const };

  try {
    const parsed = workshopMembershipSchema.parse(input);
    const supabase = createSupabaseAdminClient();
    const { data: workshop, error: workshopError } = await supabase
      .from("workshops")
      .select("manager_employee_id")
      .eq("id", parsed.workshopId)
      .eq("is_active", true)
      .maybeSingle();
    if (workshopError || !workshop) throw new Error("INVALID_WORKSHOP_MANAGER");
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, is_active, profile_id, workshop_id")
      .eq("id", parsed.employeeId)
      .maybeSingle();
    if (employeeError || !employee || !employee.is_active || employee.workshop_id !== parsed.workshopId) {
      throw new Error("INVALID_WORKSHOP_MANAGER");
    }
    if (!employee.profile_id) {
      throw new Error("MANAGER_ACCOUNT_REQUIRED");
    }
    const [{ data: profile, error: profileError }, authUser] = await Promise.all([
      supabase.from("profiles").select("employee_id, is_active").eq("id", employee.profile_id).maybeSingle(),
      getAuthUserById(employee.profile_id),
    ]);
    if (profileError || !profile || profile.employee_id !== employee.id || !profile.is_active || !authUser?.last_sign_in_at) {
      throw new Error("MANAGER_ACCOUNT_REQUIRED");
    }
    const { error: roleError } = await supabase.from("employees").update({ workshop_role: "workshop_manager" }).eq("id", employee.id);
    if (roleError) throw new Error("WORKSHOP_MANAGER_UPDATE_FAILED");
    const { error: managerUpdateError } = await supabase.from("workshops").update({ manager_employee_id: employee.id }).eq("id", parsed.workshopId).eq("is_active", true);
    if (managerUpdateError) throw new Error("WORKSHOP_MANAGER_UPDATE_FAILED");
    await createRequiredAuditLog({ action: "workshop_manager_changed", actorEmail: access.user.email, metadata: { employeeId: employee.id, previousEmployeeId: workshop.manager_employee_id, workshopId: parsed.workshopId } });
    revalidateWorkshopViews();
    return { message: t("common.mockSubmit"), ok: true as const };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return { message: code === "MANAGER_ACCOUNT_REQUIRED" ? workshopActionMessage(locale, code) : getWorkshopMutationError(locale, error, getOrderWorkflowCopy(locale).formErrorFallback), ok: false as const };
  }
}

export async function sendWorkshopManagerInviteAction(locale: AppLocale, employeeId: string) {
  const access = await requireAdminAccess(locale, ["super_admin"]);
  if (access.state !== "authenticated" || !access.user) return { message: workshopActionMessage(locale, "PERMISSION_DENIED"), ok: false as const };
  if (await isAdminDecoyEnabled()) return { message: getAdminDecoyUnavailableMessage(locale), ok: false as const };
  try {
    const result = await sendEmployeeInvite({ actor: access.user, employeeId, locale });
    revalidateWorkshopViews();
    return { message: result.emailResult.delivered ? workshopActionMessage(locale, "INVITE_SENT") : getOrderWorkflowCopy(locale).formErrorFallback, ok: result.emailResult.delivered };
  } catch {
    return { message: getOrderWorkflowCopy(locale).formErrorFallback, ok: false as const };
  }
}

export async function permanentlyDeleteWorkshopAction(locale: AppLocale, workshopId: string) {
  const access = await requireAdminAccess(locale, ["super_admin"]);
  if (access.state !== "authenticated" || !access.user) return { message: workshopActionMessage(locale, "PERMISSION_DENIED"), ok: false as const };
  const actor = access.user;
  if (await isAdminDecoyEnabled()) return { message: getAdminDecoyUnavailableMessage(locale), ok: false as const };
  try {
    const workshop = await permanentlyDeleteEmptyWorkshop(workshopId);
    await createRequiredAuditLog({ action: "workshop_permanently_deleted", actorEmail: actor.email, metadata: { workshopId: workshop.id, workshopName: workshop.name, actor: actor.email } });
    revalidateWorkshopViews();
    return { message: workshopActionMessage(locale, "WORKSHOP_DELETED"), ok: true as const };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return { message: workshopActionMessage(locale, code), ok: false as const };
  }
}

export async function moveEmployeeToWorkshopAction(
  locale: AppLocale,
  input: z.infer<typeof workshopMembershipSchema>
) {
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, ["super_admin"]);
  if (access.state !== "authenticated" || !access.user) return { message: t("common.noAccessText"), ok: false as const };
  if (await isAdminDecoyEnabled()) return { message: getAdminDecoyUnavailableMessage(locale), ok: false as const };

  try {
    const parsed = workshopMembershipSchema.parse(input);
    const supabase = createSupabaseAdminClient();
    const { data: workshop, error: workshopError } = await supabase.from("workshops").select("id").eq("id", parsed.workshopId).eq("is_active", true).maybeSingle();
    if (workshopError || !workshop) throw new Error("INVALID_WORKSHOP");
    const { data: employee, error: employeeError } = await supabase.from("employees").select("id, workshop_id").eq("id", parsed.employeeId).maybeSingle();
    if (employeeError || !employee) throw new Error("INVALID_EMPLOYEE");
    const { data: managedWorkshop, error: managedWorkshopError } = await supabase.from("workshops").select("id").eq("manager_employee_id", employee.id).maybeSingle();
    if (managedWorkshopError) throw new Error("EMPLOYEE_MOVE_FAILED");
    if (managedWorkshop && employee.workshop_id !== parsed.workshopId) throw new Error("CURRENT_WORKSHOP_MANAGER_MOVE_FORBIDDEN");
    const { error: updateError } = await supabase.from("employees").update({ workshop_id: parsed.workshopId, workshop_role: "workshop_employee" }).eq("id", employee.id);
    if (updateError) throw new Error("EMPLOYEE_MOVE_FAILED");
    await createRequiredAuditLog({ action: employee.workshop_id ? "employee_moved_workshop" : "employee_added_to_workshop", actorEmail: access.user.email, metadata: { employeeId: employee.id, workshopId: parsed.workshopId } });
    revalidateWorkshopViews();
    return { message: t("common.mockSubmit"), ok: true as const };
  } catch (error) {
    return { message: getWorkshopMutationError(locale, error, getOrderWorkflowCopy(locale).formErrorFallback), ok: false as const };
  }
}
