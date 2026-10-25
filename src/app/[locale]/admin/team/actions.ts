"use server";

import type { AppLocale } from "@/i18n/routing";
import { runFlowAction, withEmailOutcome } from "@/lib/admin/flowActions";
import {
  inviteTeamMember,
  removeTeamMember,
  resendTeamInvite,
  setTeamMemberActive,
  type TeamMemberInput,
} from "@/lib/db/workshopFlow";

export async function inviteTeamMemberAction(locale: AppLocale, input: TeamMemberInput) {
  return runFlowAction(locale, ["employee"], async (user) => withEmailOutcome("memberInvited", await inviteTeamMember(user, locale, input)));
}

export async function resendTeamInviteAction(locale: AppLocale, employeeId: string) {
  return runFlowAction(locale, ["employee"], async (user) => withEmailOutcome("inviteSent", await resendTeamInvite(user, locale, employeeId)));
}

export async function setTeamMemberActiveAction(locale: AppLocale, employeeId: string, isActive: boolean) {
  return runFlowAction(locale, ["employee"], async (user) => {
    await setTeamMemberActive(user, employeeId, isActive);
    return isActive ? "memberActivated" : "memberPaused";
  });
}

export async function removeTeamMemberAction(locale: AppLocale, employeeId: string) {
  return runFlowAction(locale, ["employee"], async (user) => {
    await removeTeamMember(user, employeeId);
    return "memberRemoved";
  });
}
