"use client";

import clsx from "clsx";
import { ChevronRight, MapPin, Pencil, Phone, Plus, Power, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  permanentlyDeleteWorkshopAction,
  saveWorkshopAction,
  toggleWorkshopActiveAction,
} from "@/app/[locale]/admin/workshops/actions";
import { useAdminConfirm } from "@/components/admin/AdminConfirm";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminDrawer, AdminFormSection } from "@/components/admin/AdminDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSwitch } from "@/components/admin/AdminSwitch";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { nextEditorKey } from "@/lib/admin/editorKey";
import type { WorkshopRecord } from "@/lib/db/workshops";

type WorkshopFormState = {
  address: string;
  code: string;
  contactName: string;
  description: string;
  email: string;
  id?: string;
  isActive: boolean;
  location: string;
  name: string;
  notes: string;
  phone: string;
};

type AdminWorkshopsClientProps = {
  canCreate: boolean;
  locale: AppLocale;
  workshops: WorkshopRecord[];
};

function createForm(workshop: WorkshopRecord | null): WorkshopFormState {
  if (!workshop) {
    return {
      address: "",
      code: "",
      contactName: "",
      description: "",
      email: "",
      isActive: true,
      location: "",
      name: "",
      notes: "",
      phone: "",
    };
  }

  return {
    address: workshop.address,
    code: workshop.code,
    contactName: workshop.contactName,
    description: workshop.description ?? "",
    email: workshop.email,
    id: workshop.id,
    isActive: workshop.isActive,
    location: workshop.location,
    name: workshop.name,
    notes: workshop.notes,
    phone: workshop.phone,
  };
}

function WorkshopEditor({
  initialState,
  locale,
  onClose,
  onDelete,
  onSaved,
}: {
  initialState: WorkshopFormState;
  locale: AppLocale;
  onClose: () => void;
  onDelete?: () => Promise<boolean>;
  onSaved: (message: string) => void;
}) {
  const t = useTranslations("Admin.workshopsPage");
  const tc = useTranslations("Admin");
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const isNew = !form.id;
  const set = <Key extends keyof WorkshopFormState>(key: Key, value: WorkshopFormState[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!form.name.trim()) {
      setMessage(tc("forms.required"));
      document.getElementById("workshop-name")?.focus();
      return;
    }

    startSaving(async () => {
      const { id, ...payload } = form;
      const result = id ? await saveWorkshopAction(locale, { ...payload, id }) : await saveWorkshopAction(locale, payload);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      onSaved(result.message);
    });
  };

  return (
    <AdminDrawer
      open
      onClose={onClose}
      title={isNew ? t("titleNew") : t("titleEdit")}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {message ? (
            <p role="alert" className="text-sm text-rose-300">{message}</p>
          ) : onDelete ? (
            <AdminButton
              variant="ghost"
              className="text-rose-300 hover:text-rose-200"
              onClick={async () => {
                if (await onDelete()) onClose();
              }}
            >
              <Trash2 />
              {tc("buttons.delete")}
            </AdminButton>
          ) : (
            <span />
          )}
          <div className="ms-auto flex gap-2">
            <AdminButton variant="ghost" onClick={onClose}>{tc("buttons.cancel")}</AdminButton>
            <AdminButton variant="primary" onClick={submit} disabled={isSaving}>
              {isSaving ? tc("productEditor.saving") : isNew ? t("create") : tc("productEditor.save")}
            </AdminButton>
          </div>
        </div>
      }
    >
      <AdminFormSection title={t("basicsTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput
            id="workshop-name"
            label={t("nameLabel")}
            required
            requiredLabel={tc("translations.required")}
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
          />
          <AdminInput
            label={t("locationLabel")}
            placeholder={t("locationPlaceholder")}
            value={form.location}
            onChange={(event) => set("location", event.target.value)}
          />
          <AdminTextarea
            wrapperClassName="sm:col-span-2"
            label={tc("workshops.descriptionLabel")}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </div>
      </AdminFormSection>

      <AdminFormSection title={t("contactTitle")} hint={t("contactHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput label={t("contactNameLabel")} value={form.contactName} onChange={(event) => set("contactName", event.target.value)} />
          <AdminInput label={t("phoneLabel")} type="tel" dir="ltr" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
          <AdminInput label={t("emailLabel")} type="email" dir="ltr" value={form.email} onChange={(event) => set("email", event.target.value)} />
          <AdminInput label={t("addressLabel")} value={form.address} onChange={(event) => set("address", event.target.value)} />
        </div>
      </AdminFormSection>

      <AdminFormSection title={t("moreTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput
            label={t("codeLabel")}
            helperText={t("codeHelper")}
            dir="ltr"
            value={form.code}
            onChange={(event) => set("code", event.target.value)}
          />
          <AdminTextarea
            label={t("notesLabel")}
            helperText={t("notesHelper")}
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </div>
        <div className="mt-4">
          <AdminSwitch
            checked={form.isActive}
            onChange={(checked) => set("isActive", checked)}
            label={t("activeLabel")}
            description={t("activeHint")}
          />
        </div>
      </AdminFormSection>
    </AdminDrawer>
  );
}

export function AdminWorkshopsClient({ canCreate, locale, workshops }: AdminWorkshopsClientProps) {
  const t = useTranslations("Admin.workshopsPage");
  const tc = useTranslations("Admin");
  const router = useRouter();
  const confirm = useAdminConfirm();
  const [, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [editing, setEditing] = useState<{ key: string; workshop: WorkshopRecord | null } | null>(null);

  const deleteWorkshop = async (workshop: WorkshopRecord) => {
    const confirmed = await confirm({
      confirmLabel: tc("buttons.delete"),
      description: t("deleteConfirmText", { count: workshop.employeeCount }),
      title: t("deleteConfirm", { name: workshop.name }),
    });
    if (!confirmed) return false;
    const result = await permanentlyDeleteWorkshopAction(locale, workshop.id);
    setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
    if (result.ok) router.refresh();
    return result.ok;
  };

  const open = (workshop: WorkshopRecord | null) => {
    setFeedback(null);
    setEditing({ key: workshop?.id ?? nextEditorKey(), workshop });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={tc("workshops.title")}
        description={t("description")}
        actions={
          canCreate ? (
            <AdminButton variant="primary" onClick={() => open(null)}>
              <Plus />
              {tc("buttons.addWorkshop")}
            </AdminButton>
          ) : undefined
        }
      />

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.tone} role="status">{feedback.message}</div>
      ) : null}

      {workshops.length === 0 ? (
        <AdminEmptyState title={t("emptyTitle")} description={t("emptyText")} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workshops.map((workshop) => (
            <li key={workshop.id} className={clsx("admin-panel flex flex-col p-4", !workshop.isActive && "opacity-70")}>
              <div className="flex items-start gap-3">
                <Link href={`/admin/workshops/${workshop.id}`} className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
                    {workshop.name}
                    {!workshop.isActive ? <AdminBadge>{tc("common.inactive")}</AdminBadge> : null}
                  </p>
                  {workshop.location ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      <MapPin className="h-3.5 w-3.5" />
                      {workshop.location}
                    </p>
                  ) : null}
                </Link>
                <AdminActionMenu
                  label={tc("productsPage.moreActions", { name: workshop.name })}
                  items={[
                    { icon: Pencil, label: tc("buttons.edit"), onSelect: () => open(workshop) },
                    {
                      icon: Power,
                      label: workshop.isActive ? tc("workshops.detail.deactivate") : tc("workshops.detail.activate"),
                      onSelect: () =>
                        startTransition(async () => {
                          const result = await toggleWorkshopActiveAction(locale, workshop.id, !workshop.isActive);
                          setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
                          if (result.ok) router.refresh();
                        }),
                    },
                    ...(canCreate
                      ? [{ danger: true, icon: Trash2, label: tc("buttons.delete"), onSelect: () => void deleteWorkshop(workshop) }]
                      : []),
                  ]}
                />
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[0.6rem] bg-white/[0.03] px-2 py-2">
                  <dt className="text-xs text-muted">{tc("workshops.cards.activeOrders")}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{workshop.activeOrders}</dd>
                </div>
                <div className="rounded-[0.6rem] bg-white/[0.03] px-2 py-2">
                  <dt className="text-xs text-muted">{tc("workshops.detail.employeeCount")}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{workshop.employeeCount}</dd>
                </div>
                <div className="rounded-[0.6rem] bg-white/[0.03] px-2 py-2">
                  <dt className="text-xs text-muted">{tc("workshops.cards.performance")}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{workshop.onTimeRate}%</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                {workshop.contactName || workshop.phone ? (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {workshop.contactName}
                      {workshop.contactName && workshop.phone ? " · " : ""}
                      <bdi>{workshop.phone}</bdi>
                    </span>
                  </span>
                ) : null}
                <Link
                  href={`/admin/workshops/${workshop.id}`}
                  className="admin-button admin-button-ghost admin-button-sm ms-auto"
                >
                  {tc("workshops.detail.viewDetails")}
                  <ChevronRight className="rtl:rotate-180" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <WorkshopEditor
          key={editing.key}
          locale={locale}
          initialState={createForm(editing.workshop)}
          onClose={() => setEditing(null)}
          onDelete={canCreate && editing.workshop ? () => deleteWorkshop(editing.workshop!) : undefined}
          onSaved={(message) => {
            setEditing(null);
            setFeedback({ message, tone: "success" });
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
