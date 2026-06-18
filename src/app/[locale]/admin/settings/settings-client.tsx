"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveAdminSettingsAction } from "@/app/[locale]/admin/settings/actions";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { AppLocale } from "@/i18n/routing";
import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
} from "@/lib/admin/clientForm";

type AdminSettingsClientProps = {
  initialNotificationEmail: string;
  locale: AppLocale;
};

function getSettingsUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      description:
        "أدِر عنوان البريد الذي يستقبل إشعارات الطلبات الجديدة من المعرض والطلبات الواردة.",
      fieldDescription:
        "إذا تُرك الحقل فارغاً فسيجري استخدام عنوان البريد الاحتياطي من الإعدادات البيئية عند توفره.",
      fieldLabel: "بريد إشعارات الطلبات",
      saveLabel: "حفظ",
      title: "الإعدادات",
    };
  }

  if (locale === "de") {
    return {
      description:
        "Verwalten Sie die E-Mail-Adresse fuer neue Bestellungen aus Galerie und Kundenfluss.",
      fieldDescription:
        "Wenn das Feld leer bleibt, wird bei Bedarf die konfigurierte Fallback-Adresse aus der Umgebung verwendet.",
      fieldLabel: "E-Mail fuer Auftragsbenachrichtigungen",
      saveLabel: "Speichern",
      title: "Einstellungen",
    };
  }

  return {
    description:
      "Manage the email address that receives new gallery and customer order notifications.",
    fieldDescription:
      "If the field stays empty, the configured environment fallback address is used when available.",
    fieldLabel: "Order notification email",
    saveLabel: "Save",
    title: "Settings",
  };
}

export function AdminSettingsClient({
  initialNotificationEmail,
  locale,
}: AdminSettingsClientProps) {
  const copy = getSettingsUiCopy(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [adminNotificationEmail, setAdminNotificationEmail] = useState(
    initialNotificationEmail
  );
  const formRef = useRef<HTMLDivElement | null>(null);
  const requiredLabel = getRequiredFieldBadge(locale);

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const nextState = { ...current };
      delete nextState[field];
      return nextState;
    });
  };

  const handleSave = () => {
    setFeedback(null);

    startTransition(async () => {
      const result = await saveAdminSettingsAction(locale, {
        adminNotificationEmail,
      });

      setFieldErrors(result.fieldErrors ?? {});
      setFeedback(result.message);

      if (!result.ok) {
        if (formRef.current) {
          formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        focusFirstInvalidField(result.fieldErrors ?? {});
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={copy.title}
        title={copy.title}
        description={copy.description}
        actions={
          <AdminButton variant="primary" onClick={handleSave} disabled={isPending}>
            {copy.saveLabel}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <div ref={formRef}>
        <AdminCard title={copy.fieldLabel} description={copy.fieldDescription}>
          <div className="grid gap-4 xl:max-w-2xl">
            <AdminInput
              id="adminNotificationEmail"
              name="adminNotificationEmail"
              type="email"
              label={copy.fieldLabel}
              value={adminNotificationEmail}
              errorText={fieldErrors.adminNotificationEmail}
              requiredLabel={requiredLabel}
              placeholder="atelier@example.com"
              onChange={(event) => {
                clearFieldError("adminNotificationEmail");
                setAdminNotificationEmail(event.target.value);
              }}
            />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
