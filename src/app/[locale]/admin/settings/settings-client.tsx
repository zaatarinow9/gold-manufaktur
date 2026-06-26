"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createManagedAdminUserAction,
  deleteManagedAdminUserAction,
  resendManagedAdminInviteAction,
  rotateOrderEntryAccessAction,
  saveNotificationSettingsAction,
  saveOrderEntrySettingsAction,
  sendManagedAdminPasswordResetAction,
  sendOrderEntryLinkEmailAction,
  toggleManagedAdminUserActiveAction,
  updateManagedAdminUserAction,
} from "@/app/[locale]/admin/settings/actions";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import type { AppLocale } from "@/i18n/routing";
import { getRequiredFieldBadge } from "@/lib/admin/clientForm";
import type { ManagedAdminRole, ManagedAdminUserRecord } from "@/lib/db/adminUsers";
import type { AdminSettingsSnapshot } from "@/lib/db/siteSettings";

type AdminSettingsClientProps = {
  canManageUsers: boolean;
  currentUserId: string;
  initialSettings: AdminSettingsSnapshot;
  initialUsers: ManagedAdminUserRecord[];
  locale: AppLocale;
  usersWarning?: string;
};

type UserFormState = {
  displayName: string;
  email: string;
  id?: string;
  isActive: boolean;
  role: ManagedAdminRole;
};

type FeedbackState =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

function getSettingsUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      adminEmail: "بريد تنبيهات الطلبات",
      copyLink: "نسخ الرابط",
      copySuccess: "تم نسخ الرابط الكامل.",
      copyUnavailable: "لا يوجد رابط كامل متاح للنسخ حالياً.",
      description:
        "إدارة عناوين الإشعارات، رابط إدخال الطلبات الخارجي، والمستخدمين من شاشة واحدة.",
      diagnosticsTitle: "تنبيه الإعدادات",
      expiresAt: "ينتهي في",
      fullLinkHelp:
        "يتم عرض الرابط الكامل كما سيصل إلى العميل، مع استخدام عنوان هذا المتصفح إذا كانت إعدادات الخادم ما تزال على localhost.",
      fullLinkLabel: "الرابط الكامل",
      inviteAgain: "إرسال رابط جديد",
      linkDisabled: "رابط إدخال الطلبات الخارجي غير مفعل حالياً.",
      linkRecipient: "إرسال الرابط إلى",
      linkRecipientHelp: "سيتم إرسال رسالة ألمانية احترافية تحتوي على زر ورابط مباشر.",
      manageUsersHint:
        "إدارة المستخدمين تتطلب صلاحية المالك أو المدير الأعلى لأنها تعمل عبر Supabase Auth على الخادم.",
      notificationTitle: "الإشعارات",
      orderEntryDescription:
        "فعّل الرابط الخارجي، راجع الرابط الكامل، وانسخه أو أرسله بالبريد الإلكتروني مباشرةً من هنا.",
      orderEntryEnabled: "تفعيل رابط إدخال الطلبات الخارجي",
      orderEntryTitle: "رابط إدخال الطلبات الخارجي",
      ownerEmail: "بريد المالك",
      privacyLocalOnly: "",
      privacyStatusActive: "",
      privacyStatusInactive: "",
      privacyTitle: "",
      role: "الدور",
      rotateLink: "تدوير الرابط",
      rotatedAt: "آخر تدوير",
      save: "حفظ",
      sendLink: "إرسال الرابط",
      smtpConfigured: "SMTP مضبوط",
      smtpMissing: "SMTP غير مكتمل",
      smtpTitle: "حالة البريد",
      statusDisabled: "معطل",
      statusEnabled: "مفعل",
      supportEmail: "بريد الدعم",
      title: "الإعدادات",
      userActive: "نشط",
      userCreate: "إنشاء مستخدم",
      userDelete: "حذف",
      userDisplayName: "الاسم الظاهر",
      userEdit: "تعديل",
      userListTitle: "المستخدمون والأدوار",
      userSave: "حفظ المستخدم",
    };
  }

  if (locale === "de") {
    return {
      adminEmail: "E-Mail fuer Auftrags- und Anfragehinweise",
      copyLink: "Link kopieren",
      copySuccess: "Der vollstaendige Link wurde kopiert.",
      copyUnavailable: "Aktuell ist kein vollstaendiger Link verfuegbar.",
      description:
        "Verwalten Sie Benachrichtigungen, den externen Auftragserfassungslink und Admin-Benutzer an einem Ort.",
      diagnosticsTitle: "Einstellungsdiagnose",
      expiresAt: "Laeuft ab am",
      fullLinkHelp:
        "Hier sehen Sie immer die vollstaendige URL, wie sie an Kunden verschickt wird. Falls der Server noch localhost meldet, wird die aktuelle Browser-Domain verwendet.",
      fullLinkLabel: "Vollstaendiger Link",
      inviteAgain: "Neuen Link senden",
      linkDisabled: "Der externe Auftragserfassungslink ist derzeit deaktiviert.",
      linkRecipient: "Link senden an",
      linkRecipientHelp:
        "Es wird eine professionelle deutsche E-Mail mit Schaltflaeche und Direktlink versendet.",
      manageUsersHint:
        "Die Benutzerverwaltung benoetigt Super-Admin-Rechte, da sie serverseitig ueber Supabase Auth arbeitet.",
      notificationTitle: "Benachrichtigungen",
      orderEntryDescription:
        "Aktivieren Sie den externen Link, pruefen Sie die vollstaendige URL und kopieren oder versenden Sie ihn direkt von hier.",
      orderEntryEnabled: "Externen Auftragserfassungslink aktivieren",
      orderEntryTitle: "Externer Auftragserfassungslink",
      ownerEmail: "Inhaber / Super-Admin",
      privacyLocalOnly: "",
      privacyStatusActive: "",
      privacyStatusInactive: "",
      privacyTitle: "",
      role: "Rolle",
      rotateLink: "Link neu erzeugen",
      rotatedAt: "Zuletzt rotiert",
      save: "Speichern",
      sendLink: "Link per E-Mail senden",
      smtpConfigured: "SMTP eingerichtet",
      smtpMissing: "SMTP unvollstaendig",
      smtpTitle: "E-Mail-Status",
      statusDisabled: "Deaktiviert",
      statusEnabled: "Aktiv",
      supportEmail: "Support / Kontakt",
      title: "Einstellungen",
      userActive: "Aktiv",
      userCreate: "Benutzer anlegen",
      userDelete: "Loeschen",
      userDisplayName: "Anzeigename",
      userEdit: "Bearbeiten",
      userListTitle: "Benutzer und Rollen",
      userSave: "Benutzer speichern",
    };
  }

  return {
    adminEmail: "Order and inquiry notification email",
    copyLink: "Copy link",
    copySuccess: "The full link was copied.",
    copyUnavailable: "No full link is available right now.",
    description:
      "Manage notification addresses, the external order-entry link, and admin users from one place.",
    diagnosticsTitle: "Settings diagnostics",
    expiresAt: "Expires at",
    fullLinkHelp:
      "This always shows the complete URL exactly as it will be shared. If the server still reports localhost, the current browser origin is used instead.",
    fullLinkLabel: "Full link",
    inviteAgain: "Send new link",
    linkDisabled: "The external order-entry link is currently disabled.",
    linkRecipient: "Send link to",
    linkRecipientHelp:
      "A professional German email with a button and direct fallback link will be sent.",
    manageUsersHint:
      "User management requires super-admin access because it uses the Supabase Auth admin API server-side.",
    notificationTitle: "Notifications",
    orderEntryDescription:
      "Enable the external link, review the full URL, and copy or email it directly from here.",
    orderEntryEnabled: "Enable external order-entry link",
    orderEntryTitle: "External order-entry link",
    ownerEmail: "Owner / super admin",
    privacyLocalOnly: "",
    privacyStatusActive: "",
    privacyStatusInactive: "",
    privacyTitle: "",
    role: "Role",
    rotateLink: "Rotate link",
    rotatedAt: "Last rotated",
    save: "Save",
    sendLink: "Send link by email",
    smtpConfigured: "SMTP configured",
    smtpMissing: "SMTP incomplete",
    smtpTitle: "Email status",
    statusDisabled: "Disabled",
    statusEnabled: "Enabled",
    supportEmail: "Support / contact",
    title: "Settings",
    userActive: "Active",
    userCreate: "Create user",
    userDelete: "Delete",
    userDisplayName: "Display name",
    userEdit: "Edit",
    userListTitle: "Users and roles",
    userSave: "Save user",
  };
}

function createUserForm(): UserFormState {
  return {
    displayName: "",
    email: "",
    isActive: true,
    role: "employee",
  };
}

function createUserEditForm(user: ManagedAdminUserRecord): UserFormState {
  return {
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    isActive: user.isActive,
    role: user.role,
  };
}

function getRoleLabel(role: ManagedAdminRole, locale: AppLocale) {
  if (locale === "ar") {
    if (role === "super_admin") return "المالك";
    if (role === "admin") return "مدير";
    return "عامل";
  }

  if (locale === "de") {
    if (role === "super_admin") return "Inhaber";
    if (role === "admin") return "Admin";
    return "Mitarbeiter";
  }

  if (role === "super_admin") return "Owner";
  if (role === "admin") return "Admin";
  return "Worker";
}

function toLocalDateTimeInput(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function fromLocalDateTimeInput(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/u, "");
}

function isLocalBaseUrl(value: string) {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(value.trim());
}

function extractTokenFromLink(link?: string) {
  return link?.split("/").at(-1) ?? "";
}

export function AdminSettingsClient({
  canManageUsers,
  currentUserId,
  initialSettings,
  initialUsers,
  locale,
  usersWarning,
}: AdminSettingsClientProps) {
  const copy = getSettingsUiCopy(locale);
  const userEmailLabel =
    locale === "ar" ? "البريد الإلكتروني" : locale === "de" ? "E-Mail" : "Email";
  const userInactiveLabel =
    locale === "ar" ? "غير نشط" : locale === "de" ? "Inaktiv" : "Inactive";
  const activateUserLabel =
    locale === "ar" ? "تفعيل" : locale === "de" ? "Aktivieren" : "Activate";
  const deactivateUserLabel =
    locale === "ar" ? "إيقاف" : locale === "de" ? "Deaktivieren" : "Deactivate";
  const resetPasswordLabel =
    locale === "ar"
      ? "إرسال رابط كلمة المرور"
      : locale === "de"
        ? "Passwort-Link senden"
        : "Send password link";
  const diagnosticsEnvironmentLabel =
    locale === "ar" ? "البيئة" : locale === "de" ? "Umgebung" : "Environment";
  const diagnosticsSiteUrlLabel =
    locale === "ar" ? "رابط الموقع" : locale === "de" ? "Site-URL" : "Site URL";
  const diagnosticsMissingEnvLabel =
    locale === "ar"
      ? "متغيرات البيئة الناقصة"
      : locale === "de"
        ? "Fehlende Umgebungsvariablen"
        : "Missing environment variables";
  const diagnosticsMigrationLabel =
    locale === "ar"
      ? "الهجرة المطلوبة"
      : locale === "de"
        ? "Benoetigte Migration"
        : "Suggested migration";
  const requiredLabel = getRequiredFieldBadge(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [adminNotificationEmail, setAdminNotificationEmail] = useState(
    initialSettings.adminNotificationEmail
  );
  const [supportNotificationEmail, setSupportNotificationEmail] = useState(
    initialSettings.supportNotificationEmail
  );
  const [ownerEmail, setOwnerEmail] = useState(initialSettings.ownerEmail);
  const [orderEntryEnabled, setOrderEntryEnabled] = useState(
    initialSettings.orderEntryEnabled
  );
  const [orderEntryExpiresAt, setOrderEntryExpiresAt] = useState(
    toLocalDateTimeInput(initialSettings.orderEntryExpiresAt)
  );
  const [orderEntryToken, setOrderEntryToken] = useState(initialSettings.orderEntryToken);
  const [linkRecipientEmail, setLinkRecipientEmail] = useState("");
  const [userFormState, setUserFormState] = useState<UserFormState>(createUserForm());
  const diagnosticsReady = initialSettings.diagnostics.available;
  const browserOrigin = useSyncExternalStore(
    () => () => {},
    () => (typeof window === "undefined" ? "" : normalizeBaseUrl(window.location.origin)),
    () => ""
  );

  const orderEntryPath = useMemo(
    () => (orderEntryToken ? `/${locale}/order-entry/${orderEntryToken}` : ""),
    [locale, orderEntryToken]
  );
  const orderEntryBaseUrl = useMemo(() => {
    const configured = normalizeBaseUrl(initialSettings.diagnostics.siteBaseUrl);

    if (configured && !isLocalBaseUrl(configured)) {
      return configured;
    }

    return browserOrigin || configured;
  }, [browserOrigin, initialSettings.diagnostics.siteBaseUrl]);
  const orderEntryFullUrl = useMemo(() => {
    if (!orderEntryPath) {
      return "";
    }

    return orderEntryBaseUrl ? `${orderEntryBaseUrl}${orderEntryPath}` : orderEntryPath;
  }, [orderEntryBaseUrl, orderEntryPath]);

  const pushFeedback = (kind: "error" | "success", message: string) => {
    setFeedback({ kind, message });
  };

  const refreshPage = () => {
    router.refresh();
  };

  const syncTokenFromLink = (link?: string) => {
    const nextToken = extractTokenFromLink(link);

    if (nextToken) {
      setOrderEntryToken(nextToken);
    }
  };

  const handleSaveNotifications = () => {
    startTransition(async () => {
      const result = await saveNotificationSettingsAction(locale, {
        adminNotificationEmail,
        ownerEmail,
        supportNotificationEmail,
      });

      pushFeedback(result.ok ? "success" : "error", result.message);

      if (result.ok) {
        refreshPage();
      }
    });
  };

  const handleSaveOrderEntry = () => {
    startTransition(async () => {
      const result = await saveOrderEntrySettingsAction(locale, {
        enabled: orderEntryEnabled,
        expiresAt: fromLocalDateTimeInput(orderEntryExpiresAt),
      });

      pushFeedback(result.ok ? "success" : "error", result.message);
      syncTokenFromLink("link" in result ? result.link : undefined);

      if (result.ok) {
        refreshPage();
      }
    });
  };

  const handleRotateLink = () => {
    startTransition(async () => {
      const result = await rotateOrderEntryAccessAction(locale, {
        enabled: orderEntryEnabled,
        expiresAt: fromLocalDateTimeInput(orderEntryExpiresAt),
      });

      pushFeedback(result.ok ? "success" : "error", result.message);
      syncTokenFromLink(result.link);

      if (result.ok) {
        refreshPage();
      }
    });
  };

  const handleCopyOrderEntryLink = async () => {
    if (!orderEntryFullUrl) {
      pushFeedback("error", copy.copyUnavailable);
      return;
    }

    try {
      await navigator.clipboard.writeText(orderEntryFullUrl);
      pushFeedback("success", copy.copySuccess);
    } catch {
      pushFeedback("error", orderEntryFullUrl);
    }
  };

  const handleSendOrderEntryLinkEmail = () => {
    startTransition(async () => {
      const result = await sendOrderEntryLinkEmailAction(locale, {
        enabled: orderEntryEnabled,
        expiresAt: fromLocalDateTimeInput(orderEntryExpiresAt),
        recipientEmail: linkRecipientEmail,
      });

      pushFeedback(result.ok ? "success" : "error", result.message);
      syncTokenFromLink(result.link);

      if (result.ok) {
        setLinkRecipientEmail("");
        refreshPage();
      }
    });
  };

  const handleUserSubmit = () => {
    startTransition(async () => {
      const result = userFormState.id
        ? await updateManagedAdminUserAction(locale, userFormState.id, {
            displayName: userFormState.displayName,
            email: userFormState.email,
            isActive: userFormState.isActive,
            role: userFormState.role,
          })
        : await createManagedAdminUserAction(locale, {
            displayName: userFormState.displayName,
            email: userFormState.email,
            isActive: userFormState.isActive,
            role: userFormState.role,
          });

      pushFeedback(result.ok ? "success" : "error", result.message);

      if (result.ok || result.shouldRefresh) {
        setUserFormState(createUserForm());
        refreshPage();
      }
    });
  };

  const handleUserInvite = (user: ManagedAdminUserRecord) => {
    startTransition(async () => {
      const result = await resendManagedAdminInviteAction(locale, user.id, {
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      });

      pushFeedback(result.ok ? "success" : "error", result.message);

      if (result.ok || result.shouldRefresh) {
        refreshPage();
      }
    });
  };

  const handleUserPasswordReset = (user: ManagedAdminUserRecord) => {
    startTransition(async () => {
      const result = await sendManagedAdminPasswordResetAction(locale, user.id, {
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      });

      pushFeedback(result.ok ? "success" : "error", result.message);

      if (result.ok || result.shouldRefresh) {
        refreshPage();
      }
    });
  };

  const handleUserToggle = (user: ManagedAdminUserRecord) => {
    startTransition(async () => {
      const result = await toggleManagedAdminUserActiveAction(
        locale,
        user.id,
        !user.isActive
      );

      pushFeedback(result.ok ? "success" : "error", result.message);

      if (result.ok) {
        refreshPage();
      }
    });
  };

  const handleUserDelete = (user: ManagedAdminUserRecord) => {
    if (!window.confirm(copy.userDelete)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteManagedAdminUserAction(locale, user.id);

      pushFeedback(result.ok ? "success" : "error", result.message);

      if (result.ok) {
        if (userFormState.id === user.id) {
          setUserFormState(createUserForm());
        }
        refreshPage();
      }
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={copy.title}
        title={copy.title}
        description={copy.description}
      />

      {feedback ? (
        <div
          className={
            feedback.kind === "success"
              ? "rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground"
              : "rounded-[1rem] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
          }
        >
          {feedback.message}
        </div>
      ) : null}

      {!diagnosticsReady ? (
        <div className="rounded-[1rem] border border-rose-400/25 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
          <p className="font-semibold">{copy.diagnosticsTitle}</p>
          <p className="mt-2">{initialSettings.diagnostics.message}</p>
          <div className="mt-3 space-y-1 text-xs text-rose-100/90">
            <p>{`${diagnosticsEnvironmentLabel}: ${initialSettings.diagnostics.environmentLabel}`}</p>
            <p>{`${diagnosticsSiteUrlLabel}: ${initialSettings.diagnostics.siteBaseUrl}`}</p>
            {initialSettings.diagnostics.missingEnvVars.length > 0 ? (
              <p>
                {`${diagnosticsMissingEnvLabel}: ${initialSettings.diagnostics.missingEnvVars.join(", ")}`}
              </p>
            ) : null}
            {initialSettings.diagnostics.suggestedMigration ? (
              <p>
                {`${diagnosticsMigrationLabel}: ${initialSettings.diagnostics.suggestedMigration}`}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {usersWarning ? (
        <div className="rounded-[1rem] border border-amber-400/25 bg-amber-400/10 px-4 py-4 text-sm text-amber-50">
          {usersWarning}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminCard
          title={copy.notificationTitle}
          description={diagnosticsReady ? undefined : initialSettings.diagnostics.message ?? undefined}
          action={
            <AdminButton
              variant="primary"
              onClick={handleSaveNotifications}
              disabled={isPending || !diagnosticsReady}
            >
              {copy.save}
            </AdminButton>
          }
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminInput
              id="adminNotificationEmail"
              name="adminNotificationEmail"
              type="email"
              label={copy.adminEmail}
              value={adminNotificationEmail}
              requiredLabel={requiredLabel}
              placeholder="service@goldhelwah.de"
              onChange={(event) => setAdminNotificationEmail(event.target.value)}
            />
            <AdminInput
              id="supportNotificationEmail"
              name="supportNotificationEmail"
              type="email"
              label={copy.supportEmail}
              value={supportNotificationEmail}
              placeholder="support@goldhelwah.de"
              onChange={(event) => setSupportNotificationEmail(event.target.value)}
            />
            <div className="xl:col-span-2">
              <AdminInput
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                label={copy.ownerEmail}
                value={ownerEmail}
                placeholder="owner@goldhelwah.de"
                onChange={(event) => setOwnerEmail(event.target.value)}
              />
            </div>
          </div>
        </AdminCard>

        <AdminCard title={copy.smtpTitle}>
          <div className="space-y-4">
            <AdminBadge variant={initialSettings.smtpStatus.configured ? "success" : "danger"}>
              {initialSettings.smtpStatus.configured ? copy.smtpConfigured : copy.smtpMissing}
            </AdminBadge>
            <div className="space-y-2 text-sm text-muted">
              <p>{`${initialSettings.smtpStatus.fromName} <${initialSettings.smtpStatus.fromAddress || "-"}>`}</p>
              {initialSettings.smtpStatus.missing.length > 0 ? (
                <p>{initialSettings.smtpStatus.missing.join(", ")}</p>
              ) : null}
            </div>
          </div>
        </AdminCard>
      </section>

      <section className="space-y-6">
        <AdminCard
          title={copy.orderEntryTitle}
          description={copy.orderEntryDescription}
          action={
            <div className="flex gap-2">
              <AdminButton
                variant="secondary"
                onClick={handleSaveOrderEntry}
                disabled={isPending || !diagnosticsReady}
              >
                {copy.save}
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={handleRotateLink}
                disabled={isPending || !diagnosticsReady}
              >
                {copy.rotateLink}
              </AdminButton>
            </div>
          }
        >
          <div className="space-y-4">
            <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={orderEntryEnabled}
                onChange={(event) => setOrderEntryEnabled(event.target.checked)}
                className="h-4 w-4 accent-[#c49a52]"
              />
              {copy.orderEntryEnabled}
            </label>

            <AdminInput
              id="orderEntryExpiresAt"
              name="orderEntryExpiresAt"
              type="datetime-local"
              label={copy.expiresAt}
              value={orderEntryExpiresAt}
              onChange={(event) => setOrderEntryExpiresAt(event.target.value)}
            />

            {orderEntryFullUrl ? (
              <AdminInput
                id="orderEntryFullUrl"
                name="orderEntryFullUrl"
                label={copy.fullLinkLabel}
                value={orderEntryFullUrl}
                helperText={copy.fullLinkHelp}
                readOnly
                className="font-mono text-xs"
              />
            ) : (
              <p className="text-sm text-muted">{copy.linkDisabled}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={handleCopyOrderEntryLink}
                disabled={!orderEntryFullUrl}
              >
                {copy.copyLink}
              </AdminButton>
              <AdminBadge variant={orderEntryEnabled ? "success" : "neutral"}>
                {orderEntryEnabled ? copy.statusEnabled : copy.statusDisabled}
              </AdminBadge>
              {initialSettings.orderEntryRotatedAt ? (
                <AdminBadge variant="info">
                  {copy.rotatedAt}:{" "}
                  {initialSettings.orderEntryRotatedAt.slice(0, 16).replace("T", " ")}
                </AdminBadge>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <AdminInput
                id="orderEntryRecipientEmail"
                name="orderEntryRecipientEmail"
                type="email"
                label={copy.linkRecipient}
                value={linkRecipientEmail}
                helperText={copy.linkRecipientHelp}
                placeholder="kunde@example.com"
                onChange={(event) => setLinkRecipientEmail(event.target.value)}
              />
              <AdminButton
                variant="primary"
                onClick={handleSendOrderEntryLinkEmail}
                disabled={
                  isPending ||
                  !diagnosticsReady ||
                  !orderEntryEnabled ||
                  linkRecipientEmail.trim().length === 0
                }
              >
                {copy.sendLink}
              </AdminButton>
            </div>
          </div>
        </AdminCard>

      </section>

      <AdminCard
        title={copy.userListTitle}
        description={!canManageUsers ? copy.manageUsersHint : undefined}
        action={
          canManageUsers ? (
            <AdminButton variant="primary" onClick={handleUserSubmit} disabled={isPending}>
              {userFormState.id ? copy.userSave : copy.userCreate}
            </AdminButton>
          ) : undefined
        }
      >
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminInput
              id="userDisplayName"
              name="userDisplayName"
              label={copy.userDisplayName}
              value={userFormState.displayName}
              requiredLabel={requiredLabel}
              onChange={(event) =>
                setUserFormState((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
            <AdminInput
              id="userEmail"
              name="userEmail"
              type="email"
              label={userEmailLabel}
              value={userFormState.email}
              requiredLabel={requiredLabel}
              onChange={(event) =>
                setUserFormState((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
            <AdminSelect
              id="userRole"
              name="userRole"
              label={copy.role}
              value={userFormState.role}
              onChange={(event) =>
                setUserFormState((current) => ({
                  ...current,
                  role: event.target.value as ManagedAdminRole,
                }))
              }
            >
              <option value="super_admin">{getRoleLabel("super_admin", locale)}</option>
              <option value="admin">{getRoleLabel("admin", locale)}</option>
              <option value="employee">{getRoleLabel("employee", locale)}</option>
            </AdminSelect>
            <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={userFormState.isActive}
                onChange={(event) =>
                  setUserFormState((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-[#c49a52]"
              />
              {copy.userActive}
            </label>
          </div>

          <div className="grid gap-4">
            {initialUsers.map((user) => (
              <article
                key={user.id}
                className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{user.displayName}</p>
                    <p className="text-sm text-muted">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminBadge variant={user.isActive ? "success" : "danger"}>
                      {user.isActive ? copy.userActive : userInactiveLabel}
                    </AdminBadge>
                    <AdminBadge variant="info">{getRoleLabel(user.role, locale)}</AdminBadge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    onClick={() => setUserFormState(createUserEditForm(user))}
                    disabled={!canManageUsers || isPending}
                  >
                    {copy.userEdit}
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUserInvite(user)}
                    disabled={!canManageUsers || isPending}
                  >
                    {copy.inviteAgain}
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUserPasswordReset(user)}
                    disabled={!canManageUsers || !user.isActive || isPending}
                  >
                    {resetPasswordLabel}
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUserToggle(user)}
                    disabled={!canManageUsers || isPending}
                  >
                    {user.isActive ? deactivateUserLabel : activateUserLabel}
                  </AdminButton>
                  {user.id !== currentUserId ? (
                    <AdminButton
                      size="sm"
                      variant="danger"
                      onClick={() => handleUserDelete(user)}
                      disabled={!canManageUsers || isPending}
                    >
                      {copy.userDelete}
                    </AdminButton>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
