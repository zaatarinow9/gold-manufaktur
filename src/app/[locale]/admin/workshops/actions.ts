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
  setWorkshopActive,
  updateWorkshop,
  type WorkshopInput,
  type WorkshopUpdateInput,
} from "@/lib/db/workshops";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const workshopMembershipSchema = z.object({
  employeeId: z.string().uuid(),
  workshopId: z.string().uuid(),
});

function revalidateWorkshopViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/workshops`);
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
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, is_active, profile_id, workshop_id")
      .eq("id", parsed.employeeId)
      .maybeSingle();
    if (employeeError || !employee || !employee.is_active || !employee.profile_id || employee.workshop_id !== parsed.workshopId) {
      throw new Error("INVALID_WORKSHOP_MANAGER");
    }
    const { error: roleError } = await supabase.from("employees").update({ workshop_role: "workshop_manager" }).eq("id", employee.id);
    if (roleError) throw new Error("WORKSHOP_MANAGER_UPDATE_FAILED");
    const { error: workshopError } = await supabase.from("workshops").update({ manager_employee_id: employee.id }).eq("id", parsed.workshopId).eq("is_active", true);
    if (workshopError) throw new Error("WORKSHOP_MANAGER_UPDATE_FAILED");
    await createRequiredAuditLog({ action: "workshop_manager_changed", actorEmail: access.user.email, metadata: { employeeId: employee.id, workshopId: parsed.workshopId } });
    revalidateWorkshopViews();
    return { message: t("common.mockSubmit"), ok: true as const };
  } catch (error) {
    return { message: getSafeActionErrorMessage(error, getOrderWorkflowCopy(locale).formErrorFallback), ok: false as const };
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
    const { error: updateError } = await supabase.from("employees").update({ workshop_id: parsed.workshopId, workshop_role: "workshop_employee" }).eq("id", employee.id);
    if (updateError) throw new Error("EMPLOYEE_MOVE_FAILED");
    if (employee.workshop_id) await supabase.from("workshops").update({ manager_employee_id: null }).eq("manager_employee_id", employee.id);
    await createRequiredAuditLog({ action: employee.workshop_id ? "employee_moved_workshop" : "employee_added_to_workshop", actorEmail: access.user.email, metadata: { employeeId: employee.id, workshopId: parsed.workshopId } });
    revalidateWorkshopViews();
    return { message: t("common.mockSubmit"), ok: true as const };
  } catch (error) {
    return { message: getSafeActionErrorMessage(error, getOrderWorkflowCopy(locale).formErrorFallback), ok: false as const };
  }
}
