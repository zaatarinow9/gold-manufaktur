"use client";

import { Mail, MessagesSquare, Pause, Play, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  resendTeamInviteAction,
  setTeamMemberActiveAction,
} from "@/app/[locale]/admin/team/actions";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { useAdminConfirm } from "@/components/admin/AdminConfirm";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useRouter as useLocaleRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { TeamMember } from "@/lib/db/workshopFlow";

type Feedback = { message: string; tone: "success" | "error" } | null;
const emptyInvite = { email: "", fullName: "", phone: "" };

export function TeamClient({ locale, team, viewerEmployeeId }: { locale: AppLocale; team: TeamMember[]; viewerEmployeeId: string }) {
  const t = useTranslations("Admin.flow.team");
  const tc = useTranslations("Admin");
  const router = useRouter();
  const localeRouter = useLocaleRouter();
  const confirm = useAdminConfirm();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [invite, setInvite] = useState(emptyInvite);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const members = team.filter((member) => !hidden.has(member.id));

  const run = (task: () => Promise<{ message: string; ok: boolean }>, after?: (ok: boolean) => void) =>
    startTransition(async () => {
      const result = await task();
      setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
      after?.(result.ok);
      router.refresh();
    });

  const remove = async (member: TeamMember) => {
    const ok = await confirm({
      confirmLabel: t("remove"),
      description: t("removeText", { count: member.openTasks }),
      title: t("removeTitle", { name: member.name }),
    });
    if (!ok) return;
    setHidden((current) => new Set(current).add(member.id));
    run(
      () => removeTeamMemberAction(locale, member.id),
      (success) => {
        if (!success) {
          setHidden((current) => {
            const next = new Set(current);
            next.delete(member.id);
            return next;
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("title")} description={t("description")} />

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.tone} role="status">
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AdminCard title={t("membersTitle", { count: members.length })} contentClassName="p-0">
          {members.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {members.map((member) => {
                const isSelf = member.id === viewerEmployeeId;
                return (
                  <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        {member.name}
                        {member.isManager ? <AdminBadge variant="gold">{t("you")}</AdminBadge> : null}
                        {!member.isActive ? <AdminBadge>{t("paused")}</AdminBadge> : null}
                        {!member.isManager && member.isActive ? (
                          member.hasSignedIn ? (
                            <AdminBadge variant="success">{t("active")}</AdminBadge>
                          ) : (
                            <AdminBadge variant="warning">{t("invited")}</AdminBadge>
                          )
                        ) : null}
                      </p>
                      <p className="truncate text-sm text-muted">
                        <bdi>{member.email}</bdi>
                        {member.phone ? (
                          <>
                            {" · "}
                            <bdi>{member.phone}</bdi>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <span className="text-sm text-muted">{t("openTasks", { count: member.openTasks })}</span>
                    {!isSelf ? (
                      <AdminActionMenu
                        label={t("actionsFor", { name: member.name })}
                        items={[
                          {
                            icon: MessagesSquare,
                            label: t("message"),
                            onSelect: () => localeRouter.push(`/admin/messages?thread=team:${member.id}`),
                          },
                          ...(!member.hasSignedIn
                            ? [{ icon: Mail, label: t("resend"), onSelect: () => run(() => resendTeamInviteAction(locale, member.id)) }]
                            : []),
                          {
                            icon: member.isActive ? Pause : Play,
                            label: member.isActive ? t("pause") : t("resume"),
                            onSelect: () => run(() => setTeamMemberActiveAction(locale, member.id, !member.isActive)),
                          },
                          { danger: true, icon: Trash2, label: t("remove"), onSelect: () => void remove(member) },
                        ]}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </AdminCard>

        <AdminCard title={t("inviteTitle")} description={t("inviteHint")}>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(
                () => inviteTeamMemberAction(locale, invite),
                (ok) => {
                  if (ok) setInvite(emptyInvite);
                }
              );
            }}
          >
            <AdminInput label={t("name")} required value={invite.fullName} onChange={(event) => setInvite((current) => ({ ...current, fullName: event.target.value }))} />
            <AdminInput
              label={t("email")}
              required
              type="email"
              dir="ltr"
              autoComplete="off"
              value={invite.email}
              onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))}
            />
            <AdminInput label={t("phone")} type="tel" dir="ltr" value={invite.phone} onChange={(event) => setInvite((current) => ({ ...current, phone: event.target.value }))} />
            <div>
              <AdminButton type="submit" variant="primary" disabled={pending || !invite.fullName.trim() || !invite.email.trim()}>
                <UserPlus />
                {pending ? t("sending") : t("invite")}
              </AdminButton>
            </div>
            <p className="text-xs leading-5 text-muted">{tc("flow.team.inviteFootnote")}</p>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}
