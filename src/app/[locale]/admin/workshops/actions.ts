"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { AppLocale } from "@/i18n/routing";
import { runFlowAction, withEmailOutcome } from "@/lib/admin/flowActions";
import { createRequiredAuditLog } from "@/lib/db/auditLogs";
import { permanentlyDeleteEmptyWorkshop, setWorkshopActive } from "@/lib/db/workshops";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createWorkshopWithManager,
  replaceWorkshopManager,
  resendManagerInvite,
  type WorkshopWithManagerInput,
} from "@/lib/db/workshopFlow";

const workshopDetailsSchema = z.object({
  description: z.string().trim().max(4000).optional().default(""),
  id: z.string().uuid(),
  location: z.string().trim().max(255).optional().default(""),
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(80).optional().default(""),
});

/** Head office creates a workshop and names its manager (who gets an invitation). */
export async function createWorkshopAction(locale: AppLocale, input: WorkshopWithManagerInput) {
  return runFlowAction(locale, ["super_admin"], async (user) => {
    const result = await createWorkshopWithManager(user, locale, input);
    return withEmailOutcome("workshopCreated", result.emailStatus);
  });
}

export async function updateWorkshopDetailsAction(locale: AppLocale, input: z.input<typeof workshopDetailsSchema>) {
  return runFlowAction(locale, ["super_admin"], async (user) => {
    const parsed = workshopDetailsSchema.parse(input);
    const { error } = await createSupabaseAdminClient()
      .from("workshops")
      .update({
        description: parsed.description || null,
        location: parsed.location || null,
        name: parsed.name,
        phone: parsed.phone || null,
      })
      .eq("id", parsed.id);
    if (error) throw new Error("FAILED");
    await createRequiredAuditLog({ action: "workshop_updated", actorEmail: user.email, metadata: { workshopId: parsed.id } });
    return "workshopSaved";
  });
}

export async function setWorkshopActiveAction(locale: AppLocale, workshopId: string, isActive: boolean) {
  return runFlowAction(locale, ["super_admin"], async () => {
    await setWorkshopActive(workshopId, isActive);
    return isActive ? "workshopActivated" : "workshopPaused";
  });
}

export async function replaceWorkshopManagerAction(
  locale: AppLocale,
  workshopId: string,
  input: { managerEmail: string; managerName: string }
) {
  return runFlowAction(locale, ["super_admin"], async (user) => {
    const result = await replaceWorkshopManager(user, locale, workshopId, input);
    return withEmailOutcome("managerChanged", result.emailStatus);
  });
}

export async function resendManagerInviteAction(locale: AppLocale, workshopId: string) {
  return runFlowAction(locale, ["super_admin"], async (user) => {
    const status = await resendManagerInvite(user, locale, workshopId);
    return withEmailOutcome("inviteSent", status);
  });
}

/**
 * Deletes a workshop with its team. With `leavePage` the browser is sent
 * back to the list straight away, so the deleted workshop's page is never
 * rendered again.
 */
export async function deleteWorkshopAction(locale: AppLocale, workshopId: string, leavePage = false) {
  const result = await runFlowAction(locale, ["super_admin"], async (user) => {
    const removed = await permanentlyDeleteEmptyWorkshop(workshopId);
    await createRequiredAuditLog({
      action: "workshop_permanently_deleted",
      actorEmail: user.email,
      metadata: { memberCount: removed.memberCount, workshopId: removed.id, workshopName: removed.name },
    });
    return "workshopDeleted";
  });
  if (result.ok && leavePage) redirect(`/${locale}/admin/workshops`);
  return result;
}
