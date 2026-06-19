"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createManagedAdminUserAction,
  deleteManagedAdminUserAction,
  resendManagedAdminInviteAction,
  rotateOrderEntryAccessAction,
  saveNotificationSettingsAction,
  saveOrderEntrySettingsAction,
  setPrivacyModeAction,
  toggleManagedAdminUserActiveAction,
  updateManagedAdminUserAction,
} from "@/app/[locale]/admin/settings/actions";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import type { ManagedAdminRole, ManagedAdminUserRecord } from "@/lib/db/adminUsers";
import type { AdminSettingsSnapshot } from "@/lib/db/siteSettings";
import type { AppLocale } from "@/i18n/routing";
import { getRequiredFieldBadge } from "@/lib/admin/clientForm";

type AdminSettingsClientProps = {
  canManagePrivacy: boolean;
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
      activatePrivacy: "تفعيل وضع الخصوصية",
      adminEmail: "بريد إشعارات الطلبات",
      copyLink: "نسخ الرابط",
      description:
        "إدارة عناوين الإشعارات، خصوصية الورشة، رابط إنشاء الطلبات الخارجي، والمستخدمين من لوحة واحدة.",
      diagnosticsTitle: "تنبيه الإعدادات",
      expiresAt: "ينتهي في",
      hiddenHint: "اضغط ثلاث مرات مع Shift لفتح وضع الخصوصية.",
      inviteAgain: "إرسال رابط جديد",
      linkDisabled: "الرابط الخارجي معطل حالياً.",
      manageUsersHint:
        "إدارة المستخدمين تتطلب صلاحية المالك أو المدير الأعلى لأن الإنشاء يتم عبر Supabase Auth على الخادم.",
      notificationTitle: "رسائل الإشعار",
      orderEntryEnabled: "تفعيل رابط إنشاء الطلبات",
      orderEntryTitle: "رابط إنشاء الطلبات الخارجي",
      ownerEmail: "بريد المالك",
      privacyEnabled: "وضع الخصوصية مفعل",
      privacyInactive: "تفاصيل الطلبات تظهر بشكل طبيعي.",
      privacyPassphrase: "عبارة التفعيل",
      privacyReason: "سبب التفعيل",
      privacyReveal:
        "سيتم إخفاء تفاصيل الطلبات من شاشات العمل حتى يقوم مالك النظام بالكشف عنها من جديد.",
      privacyTitle: "وضع الخصوصية",
      role: "الدور",
      rotateLink: "تدوير الرابط",
      save: "حفظ",
      smtpConfigured: "SMTP مضبوط",
      smtpMissing: "SMTP غير مكتمل",
      smtpTitle: "حالة البريد",
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
      activatePrivacy: "Privatsphaere aktivieren",
      adminEmail: "E-Mail fuer Auftrags- und Anfragehinweise",
      copyLink: "Link kopieren",
      description:
        "Verwalten Sie Benachrichtigungen, Werkstatt-Privatsphaere, den externen Auftragserfassungslink und Admin-Benutzer an einem Ort.",
      diagnosticsTitle: "Einstellungsdiagnose",
      expiresAt: "Laeuft ab am",
      hiddenHint: "Dreimal mit gedrueckter Umschalttaste klicken, um den Privatsphaerenmodus zu oeffnen.",
      inviteAgain: "Neuen Link senden",
      linkDisabled: "Der externe Auftragserfassungslink ist derzeit deaktiviert.",
      manageUsersHint:
        "Die Benutzerverwaltung benoetigt Super-Admin-Rechte, da sie serverseitig ueber Supabase Auth arbeitet.",
      notificationTitle: "Benachrichtigungen",
      orderEntryEnabled: "Externen Auftragserfassungslink aktivieren",
      orderEntryTitle: "Externer Auftragserfassungslink",
      ownerEmail: "Inhaber / Super-Admin",
      privacyEnabled: "Der Privatsphaerenmodus ist aktiv.",
      privacyInactive: "Auftragsdetails werden normal angezeigt.",
      privacyPassphrase: "Aktivierungs-Passphrase",
      privacyReason: "Begruendung",
      privacyReveal:
        "Aktive Auftragsdetails werden fuer Werkstatt- und Dashboard-Ansichten neutralisiert, bis ein Super-Admin sie wieder freigibt.",
      privacyTitle: "Privatsphaerenmodus",
      role: "Rolle",
      rotateLink: "Link neu erzeugen",
      save: "Speichern",
      smtpConfigured: "SMTP eingerichtet",
      smtpMissing: "SMTP unvollstaendig",
      smtpTitle: "E-Mail-Status",
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
    activatePrivacy: "Enable privacy mode",
    adminEmail: "Order and inquiry notification email",
    copyLink: "Copy link",
    description:
      "Manage notifications, workshop privacy, the external order-entry link, and admin users from one place.",
    diagnosticsTitle: "Settings diagnostics",
    expiresAt: "Expires at",
    hiddenHint: "Shift-click three times to unlock privacy mode controls.",
    inviteAgain: "Send new link",
    linkDisabled: "The external order-entry link is currently disabled.",
    manageUsersHint:
      "User management requires super-admin access because it uses the Supabase Auth admin API server-side.",
    notificationTitle: "Notifications",
    orderEntryEnabled: "Enable external order-entry link",
    orderEntryTitle: "External order-entry link",
    ownerEmail: "Owner / super admin",
    privacyEnabled: "Privacy mode is currently enabled.",
    privacyInactive: "Order details are shown normally.",
    privacyPassphrase: "Activation passphrase",
    privacyReason: "Reason",
    privacyReveal:
      "Active order details are masked for workshop and dashboard views until a super admin reveals them again.",
    privacyTitle: "Privacy mode",
    role: "Role",
    rotateLink: "Rotate link",
    save: "Save",
    smtpConfigured: "SMTP configured",
    smtpMissing: "SMTP incomplete",
    smtpTitle: "Email status",
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
    if (role === "viewer") return "مشاهد";
    return "عامل";
  }

  if (locale === "de") {
    if (role === "super_admin") return "Inhaber";
    if (role === "admin") return "Admin";
    if (role === "viewer") return "Beobachter";
    return "Mitarbeiter";
  }

  if (role === "super_admin") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "viewer") return "Viewer";
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

export function AdminSettingsClient({
  canManagePrivacy,
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
  const [orderEntryToken, setOrderEntryToken] = useState(
    initialSettings.orderEntryToken
  );
  const [privacyEnabled, setPrivacyEnabled] = useState(
    initialSettings.privacyModeEnabled
  );
  const [privacyReason, setPrivacyReason] = useState(
    initialSettings.privacyModeReason
  );
  const [privacyPassphrase, setPrivacyPassphrase] = useState("");
  const [privacyComposerOpen, setPrivacyComposerOpen] = useState(
    initialSettings.privacyModeEnabled
  );
  const [gestureClicks, setGestureClicks] = useState<number[]>([]);
  const [userFormState, setUserFormState] = useState<UserFormState>(createUserForm());
  const diagnosticsReady = initialSettings.diagnostics.available;
  const orderEntryPath = useMemo(
    () =>
      orderEntryToken ? `/${locale}/order-entry/${orderEntryToken}` : "",
    [locale, orderEntryToken]
  );

  const pushFeedback = (kind: "error" | "success", message: string) => {
    setFeedback({ kind, message });
  };

  const refreshPage = () => {
    router.refresh();
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

      if (result.ok && result.link) {
        const token = result.link.split("/").at(-1) ?? "";
        setOrderEntryToken(token);
      }

      if (result.ok) {
        refreshPage();
      }
    });
  };

  const handleCopyOrderEntryLink = async () => {
    if (!orderEntryPath || typeof window === "undefined") {
      return;
    }

    const link = new URL(orderEntryPath, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(link);
      pushFeedback("success", link);
    } catch {
      pushFeedback("error", link);
    }
  };

  const handlePrivacyGesture = (shiftKey: boolean) => {
    if (!canManagePrivacy || !shiftKey) {
      return;
    }

    const now = Date.now();
    const nextClicks = [...gestureClicks.filter((time) => now - time < 1800), now];
    setGestureClicks(nextClicks);

    if (nextClicks.length >= 3) {
      setPrivacyComposerOpen(true);
      setGestureClicks([]);
    }
  };

  const handlePrivacySave = (nextEnabled = privacyEnabled) => {
    startTransition(async () => {
      const result = await setPrivacyModeAction(locale, {
        enabled: nextEnabled,
        passphrase: privacyPassphrase,
        reason: privacyReason,
      });

      pushFeedback(result.ok ? "success" : "error", result.message);

      if (result.ok) {
        setPrivacyPassphrase("");
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

      if (result.ok) {
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

      if (result.ok) {
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
        actions={
          <>
            <AdminButton
              variant="secondary"
              onClick={handleSaveNotifications}
              disabled={isPending || !diagnosticsReady}
            >
              {copy.save}
            </AdminButton>
            <button
              type="button"
              onClick={(event) => handlePrivacyGesture(event.shiftKey)}
              className="h-3 w-3 rounded-full border border-transparent bg-transparent"
              aria-label="privacy-gesture"
            />
          </>
        }
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
              {initialSettings.smtpStatus.configured
                ? copy.smtpConfigured
                : copy.smtpMissing}
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

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminCard
          title={copy.orderEntryTitle}
          description={orderEntryEnabled ? orderEntryPath || copy.linkDisabled : copy.linkDisabled}
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
            {orderEntryPath ? (
              <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4">
                <p className="text-sm text-foreground">{orderEntryPath}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminButton size="sm" variant="ghost" onClick={handleCopyOrderEntryLink}>
                    {copy.copyLink}
                  </AdminButton>
                  {initialSettings.orderEntryRotatedAt ? (
                    <AdminBadge variant="info">
                      {initialSettings.orderEntryRotatedAt.slice(0, 16).replace("T", " ")}
                    </AdminBadge>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </AdminCard>

        <AdminCard
          title={copy.privacyTitle}
          description={privacyEnabled ? copy.privacyEnabled : copy.privacyInactive}
          action={
            canManagePrivacy && privacyEnabled ? (
              <AdminButton
                variant="secondary"
                onClick={() => {
                  setPrivacyEnabled(false);
                  handlePrivacySave(false);
                }}
                disabled={isPending}
              >
                {copy.save}
              </AdminButton>
            ) : undefined
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted">{copy.privacyReveal}</p>
            <p className="text-xs text-muted">{copy.hiddenHint}</p>
            {privacyComposerOpen && canManagePrivacy ? (
              <div className="space-y-4 rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4">
                <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={privacyEnabled}
                    onChange={(event) => setPrivacyEnabled(event.target.checked)}
                    className="h-4 w-4 accent-[#c49a52]"
                  />
                  {copy.activatePrivacy}
                </label>
                <AdminTextarea
                  id="privacyReason"
                  name="privacyReason"
                  label={copy.privacyReason}
                  value={privacyReason}
                  onChange={(event) => setPrivacyReason(event.target.value)}
                />
                {privacyEnabled ? (
                  <AdminInput
                    id="privacyPassphrase"
                    name="privacyPassphrase"
                    label={copy.privacyPassphrase}
                    value={privacyPassphrase}
                    onChange={(event) => setPrivacyPassphrase(event.target.value)}
                  />
                ) : null}
                <AdminButton
                  variant="primary"
                  onClick={() => handlePrivacySave()}
                  disabled={isPending}
                >
                  {copy.save}
                </AdminButton>
              </div>
            ) : null}
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
              <option value="viewer">{getRoleLabel("viewer", locale)}</option>
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
