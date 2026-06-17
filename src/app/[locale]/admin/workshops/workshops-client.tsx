"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  saveWorkshopAction,
  toggleWorkshopActiveAction,
} from "@/app/[locale]/admin/workshops/actions";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import type { WorkshopRecord } from "@/lib/db/workshops";

type WorkshopFormState = {
  address: string;
  code: string;
  contactName: string;
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

function createEmptyForm(): WorkshopFormState {
  return {
    address: "",
    code: "",
    contactName: "",
    email: "",
    isActive: true,
    location: "",
    name: "",
    notes: "",
    phone: "",
  };
}

function createEditForm(workshop: WorkshopRecord): WorkshopFormState {
  return {
    address: workshop.address,
    code: workshop.code,
    contactName: workshop.contactName,
    email: workshop.email,
    id: workshop.id,
    isActive: workshop.isActive,
    location: workshop.location,
    name: workshop.name,
    notes: workshop.notes,
    phone: workshop.phone,
  };
}

export function AdminWorkshopsClient({
  canCreate,
  locale,
  workshops,
}: AdminWorkshopsClientProps) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [formState, setFormState] = useState<WorkshopFormState>(createEmptyForm);

  const resetForm = () => {
    setEditorOpen(false);
    setFormState(createEmptyForm());
  };

  const submitForm = () => {
    startTransition(async () => {
      const payload = {
        address: formState.address,
        code: formState.code,
        contactName: formState.contactName,
        email: formState.email,
        isActive: formState.isActive,
        location: formState.location,
        name: formState.name,
        notes: formState.notes,
        phone: formState.phone,
      };
      const result = formState.id
        ? await saveWorkshopAction(locale, { ...payload, id: formState.id })
        : await saveWorkshopAction(locale, payload);

      setFeedback(result.message);

      if (result.ok) {
        resetForm();
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("workshops.eyebrow")}
        title={t("workshops.title")}
        description={t("workshops.description")}
        actions={
          canCreate ? (
            <AdminButton
              variant="primary"
              onClick={() => {
                setFeedback(null);
                setFormState(createEmptyForm());
                setEditorOpen(true);
              }}
            >
              {t("buttons.addWorkshop")}
            </AdminButton>
          ) : undefined
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      {editorOpen ? (
        <AdminCard
          title={formState.id ? t("buttons.edit") : t("buttons.addWorkshop")}
          action={
            <div className="flex gap-2">
              <AdminButton variant="ghost" onClick={resetForm}>
                {t("buttons.close")}
              </AdminButton>
              <AdminButton variant="primary" onClick={submitForm} disabled={isPending}>
                {t("buttons.save")}
              </AdminButton>
            </div>
          }
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminInput
              label="Name"
              value={formState.name}
              onChange={(event) =>
                setFormState((current) => ({ ...current, name: event.target.value }))
              }
            />
            <AdminInput
              label="Code"
              value={formState.code}
              onChange={(event) =>
                setFormState((current) => ({ ...current, code: event.target.value }))
              }
            />
            <AdminInput
              label="Location"
              value={formState.location}
              onChange={(event) =>
                setFormState((current) => ({ ...current, location: event.target.value }))
              }
            />
            <AdminInput
              label="Contact Name"
              value={formState.contactName}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  contactName: event.target.value,
                }))
              }
            />
            <AdminInput
              label="Phone"
              value={formState.phone}
              onChange={(event) =>
                setFormState((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <AdminInput
              label="Email"
              value={formState.email}
              onChange={(event) =>
                setFormState((current) => ({ ...current, email: event.target.value }))
              }
            />
            <AdminTextarea
              label="Address"
              value={formState.address}
              onChange={(event) =>
                setFormState((current) => ({ ...current, address: event.target.value }))
              }
            />
            <AdminTextarea
              label="Notes"
              value={formState.notes}
              onChange={(event) =>
                setFormState((current) => ({ ...current, notes: event.target.value }))
              }
            />
            <div className="xl:col-span-2">
              <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#c49a52]"
                />
                {t("common.active")}
              </label>
            </div>
          </div>
        </AdminCard>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        {workshops.map((workshop) => (
          <AdminCard key={workshop.id} contentClassName="space-y-5 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{workshop.name}</h2>
                <p className="text-sm text-muted">{workshop.location || workshop.code}</p>
              </div>
              <AdminBadge variant={workshop.isActive ? "success" : "danger"}>
                {workshop.isActive ? t("common.active") : t("common.inactive")}
              </AdminBadge>
            </div>

            <div className="grid gap-3 rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4 text-sm text-muted">
              <div className="flex justify-between gap-4">
                <span>{t("workshops.cards.contact")}</span>
                <span className="text-foreground">{workshop.contactName || workshop.phone}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("workshops.cards.activeOrders")}</span>
                <span className="text-foreground">{workshop.activeOrders}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("workshops.cards.completed")}</span>
                <span className="text-foreground">{workshop.completedThisMonth}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("workshops.cards.performance")}</span>
                <span className="text-foreground">{`${workshop.onTimeRate}%`}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>{t("workshops.cards.email")}</span>
                <span className="text-foreground">{workshop.email || "-"}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={() => {
                  setFeedback(null);
                  setFormState(createEditForm(workshop));
                  setEditorOpen(true);
                }}
              >
                {t("buttons.edit")}
              </AdminButton>
              <AdminButton
                size="sm"
                variant={workshop.isActive ? "ghost" : "danger"}
                onClick={() =>
                  startTransition(async () => {
                    const result = await toggleWorkshopActiveAction(
                      locale,
                      workshop.id,
                      !workshop.isActive
                    );
                    setFeedback(result.message);
                    if (result.ok) {
                      router.refresh();
                    }
                  })
                }
              >
                {workshop.isActive ? t("buttons.deactivate") : t("buttons.activate")}
              </AdminButton>
            </div>
          </AdminCard>
        ))}
      </section>
    </div>
  );
}
