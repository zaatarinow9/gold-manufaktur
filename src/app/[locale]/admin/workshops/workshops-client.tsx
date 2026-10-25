"use client";

import clsx from "clsx";
import { ChevronRight, MailCheck, MailQuestion, MapPin, Plus, Power, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { createWorkshopAction, deleteWorkshopAction, setWorkshopActiveAction } from "@/app/[locale]/admin/workshops/actions";
import { useAdminConfirm } from "@/components/admin/AdminConfirm";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminDrawer, AdminFormSection } from "@/components/admin/AdminDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { WorkshopRecord } from "@/lib/db/workshops";

type Feedback = { message: string; tone: "success" | "error" } | null;

const emptyForm = { location: "", managerEmail: "", managerName: "", name: "", phone: "" };

function NewWorkshopDrawer({
  locale,
  onClose,
  onDone,
}: {
  locale: AppLocale;
  onClose: () => void;
  onDone: (feedback: Feedback) => void;
}) {
  const t = useTranslations("Admin.flow.workshops");
  const tc = useTranslations("Admin");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (key: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createWorkshopAction(locale, form);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onDone({ message: result.message, tone: "success" });
    });
  };

  return (
    <AdminDrawer
      open
      onClose={onClose}
      title={t("newTitle")}
      description={t("newHint")}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AdminButton variant="ghost" onClick={onClose} disabled={pending}>
            {tc("buttons.cancel")}
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={submit}
            disabled={pending || !form.name.trim() || !form.managerName.trim() || !form.managerEmail.trim()}
          >
            {pending ? t("creating") : t("create")}
          </AdminButton>
        </div>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {error ? (
          <div className="admin-notice" data-tone="error" role="alert">
            {error}
          </div>
        ) : null}
        <AdminFormSection title={t("sectionWorkshop")}>
          <div className="grid gap-4">
            <AdminInput label={t("name")} required value={form.name} onChange={(event) => set("name", event.target.value)} placeholder={t("namePlaceholder")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label={t("location")} value={form.location} onChange={(event) => set("location", event.target.value)} />
              <AdminInput label={t("phone")} type="tel" dir="ltr" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
            </div>
          </div>
        </AdminFormSection>
        <AdminFormSection title={t("sectionManager")} hint={t("managerHint")}>
          <div className="grid gap-4">
            <AdminInput label={t("managerName")} required value={form.managerName} onChange={(event) => set("managerName", event.target.value)} />
            <AdminInput
              label={t("managerEmail")}
              required
              type="email"
              dir="ltr"
              autoComplete="off"
              value={form.managerEmail}
              onChange={(event) => set("managerEmail", event.target.value)}
              helperText={t("managerEmailHint")}
            />
          </div>
        </AdminFormSection>
        <button type="submit" hidden />
      </form>
    </AdminDrawer>
  );
}

export function ManagerStatus({ workshop }: { workshop: Pick<WorkshopRecord, "manager"> }) {
  const t = useTranslations("Admin.flow.workshops");
  if (!workshop.manager) {
    return <AdminBadge variant="warning">{t("noManager")}</AdminBadge>;
  }
  return workshop.manager.hasSignedIn ? (
    <AdminBadge variant="success">
      <MailCheck className="h-3.5 w-3.5" />
      {t("managerActive")}
    </AdminBadge>
  ) : (
    <AdminBadge variant="gold">
      <MailQuestion className="h-3.5 w-3.5" />
      {t("managerInvited")}
    </AdminBadge>
  );
}

export function AdminWorkshopsClient({ locale, workshops }: { locale: AppLocale; workshops: WorkshopRecord[] }) {
  const t = useTranslations("Admin.flow.workshops");
  const tc = useTranslations("Admin");
  const router = useRouter();
  const confirm = useAdminConfirm();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [creating, setCreating] = useState(false);
  // Removed rows disappear at once, even before the server answers.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const visible = workshops.filter((workshop) => !hidden.has(workshop.id));

  const remove = async (workshop: WorkshopRecord) => {
    const ok = await confirm({
      confirmLabel: tc("buttons.delete"),
      description: t("deleteText", { orders: workshop.activeOrders, team: workshop.employeeCount }),
      title: t("deleteTitle", { name: workshop.name }),
    });
    if (!ok) return;
    setHidden((current) => new Set(current).add(workshop.id));
    startTransition(async () => {
      const result = await deleteWorkshopAction(locale, workshop.id);
      setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
      if (!result.ok) {
        setHidden((current) => {
          const next = new Set(current);
          next.delete(workshop.id);
          return next;
        });
      }
      router.refresh();
    });
  };

  const toggle = (workshop: WorkshopRecord) =>
    startTransition(async () => {
      const result = await setWorkshopActiveAction(locale, workshop.id, !workshop.isActive);
      setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={tc("workshops.title")}
        description={t("pageHint")}
        actions={
          <AdminButton variant="primary" onClick={() => setCreating(true)}>
            <Plus />
            {t("new")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.tone} role="status">
          {feedback.message}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <AdminEmptyState
          title={t("emptyTitle")}
          description={t("emptyText")}
          action={
            <AdminButton variant="primary" onClick={() => setCreating(true)}>
              <Plus />
              {t("new")}
            </AdminButton>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy={pending || undefined}>
          {visible.map((workshop) => (
            <li key={workshop.id} className={clsx("admin-panel flex flex-col p-4", !workshop.isActive && "opacity-70")}>
              <div className="flex items-start gap-3">
                <Link href={`/admin/workshops/${workshop.id}`} className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
                    {workshop.name}
                    {!workshop.isActive ? <AdminBadge>{t("paused")}</AdminBadge> : null}
                  </p>
                  {workshop.location ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      <MapPin className="h-3.5 w-3.5" />
                      {workshop.location}
                    </p>
                  ) : null}
                </Link>
                <AdminActionMenu
                  label={t("actionsFor", { name: workshop.name })}
                  items={[
                    { icon: Power, label: workshop.isActive ? t("pause") : t("resume"), onSelect: () => toggle(workshop) },
                    { danger: true, icon: Trash2, label: tc("buttons.delete"), onSelect: () => void remove(workshop) },
                  ]}
                />
              </div>

              <div className="mt-4 rounded-[0.7rem] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="text-xs text-muted">{t("manager")}</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">
                    {workshop.manager?.name ?? "–"}
                  </p>
                  <ManagerStatus workshop={workshop} />
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-[0.6rem] bg-white/[0.03] px-2 py-2">
                  <dt className="text-xs text-muted">{t("openOrders")}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{workshop.activeOrders}</dd>
                </div>
                <div className="rounded-[0.6rem] bg-white/[0.03] px-2 py-2">
                  <dt className="text-xs text-muted">{t("teamSize")}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{workshop.employeeCount}</dd>
                </div>
              </dl>

              <Link
                href={`/admin/workshops/${workshop.id}`}
                className="admin-button admin-button-ghost admin-button-sm mt-3 self-end"
              >
                {t("open")}
                <ChevronRight className="rtl:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <NewWorkshopDrawer
          locale={locale}
          onClose={() => setCreating(false)}
          onDone={(next) => {
            setCreating(false);
            setFeedback(next);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
