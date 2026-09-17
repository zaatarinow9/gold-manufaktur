"use client";

import {
  type ChangeEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  createManagedAdminUserAction,
  deleteManagedAdminUserAction,
  resendManagedAdminInviteAction,
  rotateOrderEntryAccessAction,
  saveNotificationSettingsAction,
  saveOrderEntrySettingsAction,
  savePublicVisualSettingsAction,
  previewOrderMaintenanceAction,
  executeOrderMaintenanceAction,
  sendManagedAdminPasswordResetAction,
  sendOrderEntryLinkEmailAction,
  toggleManagedAdminUserActiveAction,
  updateManagedAdminUserAction,
} from "@/app/[locale]/admin/settings/actions";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminActionPendingBar } from "@/components/admin/AdminActionPendingBar";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { LuxuryMedia } from "@/components/shared/LuxuryMedia";
import type { AppLocale } from "@/i18n/routing";
import { getRequiredFieldBadge } from "@/lib/admin/clientForm";
import type { ManagedAdminRole, ManagedAdminUserRecord } from "@/lib/db/adminUsers";
import type { AdminSettingsSnapshot } from "@/lib/db/siteSettings";
import {
  STATIC_SITE_IMAGE_INPUT_ACCEPT,
  type StaticSiteImageRecord,
  type StaticSiteImageSlot,
} from "@/lib/site-images";

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

type AdminLoadingKey =
  | "loading"
  | "saving"
  | "updating"
  | "previewing"
  | "executing"
  | "uploading"
  | "archiving"
  | "clearing"
  | "deleting"
  | "resetting";

type OrderMaintenanceMode =
  | "archive_completed"
  | "clear_active"
  | "delete_permanent";

type SiteImageResponse = {
  error?: string;
  image?: StaticSiteImageRecord | null;
  success: boolean;
};

const SITE_IMAGE_SLOTS: StaticSiteImageSlot[] = [
  "homepageHero",
  "shopHero",
  "promoPopupImage",
];

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
  const settingsCopy = useTranslations("Admin.settingsClient");
  const orderMaintenance = useTranslations("Admin.orderMaintenance");
  const loading = useTranslations("Admin.loading");
  const siteImagesCopy = useTranslations("Admin.siteImages");
  const publicVisuals = useTranslations("PublicVisuals");
  const userEmailLabel = settingsCopy("email");
  const userInactiveLabel = settingsCopy("inactive");
  const activateUserLabel = settingsCopy("activate");
  const deactivateUserLabel = settingsCopy("deactivate");
  const resetPasswordLabel = settingsCopy("sendPasswordLink");
  const diagnosticsEnvironmentLabel = settingsCopy("environment");
  const diagnosticsSiteUrlLabel = settingsCopy("siteUrl");
  const diagnosticsMissingEnvLabel = settingsCopy("missingEnvironment");
  const diagnosticsMigrationLabel = settingsCopy("requiredMigration");
  const requiredLabel = getRequiredFieldBadge(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<AdminLoadingKey>("loading");
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
  const [siteImagePreviewUrls, setSiteImagePreviewUrls] = useState<
    Record<StaticSiteImageSlot, string>
  >({
    homepageHero: initialSettings.publicVisualSettings.homepageHeroImageUrl,
    promoPopupImage: initialSettings.publicVisualSettings.promoPopup.imageUrl,
    shopHero: initialSettings.publicVisualSettings.shopHeroImageUrl,
  });
  const [promo, setPromo] = useState(initialSettings.publicVisualSettings.promoPopup);
  const [maintenancePreview, setMaintenancePreview] = useState<
    Record<OrderMaintenanceMode, number | null>
  >({
    archive_completed: null,
    clear_active: null,
    delete_permanent: null,
  });
  const [maintenancePreviewTokens, setMaintenancePreviewTokens] = useState<
    Record<OrderMaintenanceMode, string>
  >({
    archive_completed: "",
    clear_active: "",
    delete_permanent: "",
  });
  const [maintenanceConfirmation, setMaintenanceConfirmation] = useState<
    Record<OrderMaintenanceMode, boolean>
  >({
    archive_completed: false,
    clear_active: false,
    delete_permanent: false,
  });
  const [userFormState, setUserFormState] = useState<UserFormState>(createUserForm());
  const fileInputRefs = useRef<Record<StaticSiteImageSlot, HTMLInputElement | null>>({
    homepageHero: null,
    promoPopupImage: null,
    shopHero: null,
  });
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

  const runPendingAction = (label: AdminLoadingKey, action: () => Promise<void>) => {
    setPendingAction(label);
    startTransition(action);
  };

  const syncTokenFromLink = (link?: string) => {
    const nextToken = extractTokenFromLink(link);

    if (nextToken) {
      setOrderEntryToken(nextToken);
    }
  };

  const handleSaveNotifications = () => {
    runPendingAction("saving", async () => {
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
    runPendingAction("saving", async () => {
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

  const getSiteImageLabel = (slot: StaticSiteImageSlot) => {
    if (slot === "homepageHero") {
      return siteImagesCopy("homepageHero");
    }

    if (slot === "shopHero") {
      return siteImagesCopy("shopHero");
    }

    return siteImagesCopy("promoPopup");
  };

  const getSiteImageErrorMessage = (error?: string) => {
    if (error === "FILE_TOO_LARGE" || error === "INVALID_FILE_TYPE" || error === "MISSING_FILE") {
      return siteImagesCopy("invalidFile");
    }

    return siteImagesCopy("uploadError");
  };

  const handleSavePublicVisuals = () =>
    runPendingAction("saving", async () => {
      const result = await savePublicVisualSettingsAction(locale, {
        promoPopup: {
          ctaText: promo.ctaText,
          ctaUrl: promo.ctaUrl,
          description: promo.description,
          enabled: promo.enabled,
          endsAt: promo.endsAt,
          showOnce: promo.showOnce,
          startsAt: promo.startsAt,
          style: promo.style,
          title: promo.title,
          videoUrl: promo.videoUrl,
        },
      });
      pushFeedback(result.ok ? "success" : "error", result.message);
      if (result.ok) refreshPage();
    });

  const handleSiteImageUpload = (
    slot: StaticSiteImageSlot,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    runPendingAction("uploading", async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("slot", slot);

      try {
        const response = await fetch("/api/admin/site-images", {
          body: formData,
          method: "POST",
        });
        const result = (await response.json()) as SiteImageResponse;

        if (!response.ok || !result.success || !result.image) {
          pushFeedback("error", getSiteImageErrorMessage(result.error));
          return;
        }

        setSiteImagePreviewUrls((current) => ({
          ...current,
          [slot]: result.image?.publicUrl ?? "",
        }));

        if (slot === "promoPopupImage") {
          setPromo((current) => ({
            ...current,
            imageUrl: result.image?.publicUrl ?? "",
          }));
        }

        pushFeedback("success", siteImagesCopy("uploadSuccess"));
        refreshPage();
      } catch {
        pushFeedback("error", siteImagesCopy("uploadError"));
      }
    });
  };

  const handleSiteImageReset = (slot: StaticSiteImageSlot) => {
    runPendingAction("resetting", async () => {
      try {
        const response = await fetch("/api/admin/site-images", {
          body: JSON.stringify({ slot }),
          headers: {
            "content-type": "application/json",
          },
          method: "DELETE",
        });
        const result = (await response.json()) as SiteImageResponse;

        if (!response.ok || !result.success) {
          pushFeedback("error", getSiteImageErrorMessage(result.error));
          return;
        }

        setSiteImagePreviewUrls((current) => ({
          ...current,
          [slot]: "",
        }));

        if (slot === "promoPopupImage") {
          setPromo((current) => ({
            ...current,
            imageUrl: "",
          }));
        }

        pushFeedback("success", siteImagesCopy("resetSuccess"));
        refreshPage();
      } catch {
        pushFeedback("error", siteImagesCopy("uploadError"));
      }
    });
  };

  const previewMaintenance = (mode: OrderMaintenanceMode) =>
    runPendingAction(
      mode === "archive_completed"
        ? "archiving"
        : mode === "clear_active"
          ? "clearing"
          : "previewing",
      async () => {
        const result = await previewOrderMaintenanceAction(locale, mode);

        if (result.ok) {
          setMaintenancePreview((current) => ({
            ...current,
            [mode]: result.count,
          }));
          setMaintenancePreviewTokens((current) => ({
            ...current,
            [mode]: result.previewToken ?? "",
          }));
          setMaintenanceConfirmation((current) => ({
            ...current,
            [mode]: false,
          }));
        } else {
          setMaintenancePreviewTokens((current) => ({
            ...current,
            [mode]: "",
          }));
          setMaintenanceConfirmation((current) => ({
            ...current,
            [mode]: false,
          }));
        }

        pushFeedback(
          result.ok ? "success" : "error",
          result.ok
            ? result.count === 0
              ? orderMaintenance("noOrders")
              : orderMaintenance("previewSuccess")
            : result.message
        );
      }
    );

  const executeMaintenance = (mode: OrderMaintenanceMode) =>
    runPendingAction(
      mode === "archive_completed"
        ? "archiving"
        : mode === "clear_active"
          ? "clearing"
          : "deleting",
      async () => {
        const result = await executeOrderMaintenanceAction(locale, {
          confirmedOrdersOnly: true,
          expectedCount: maintenancePreview[mode] ?? 0,
          mode,
          previewToken: maintenancePreviewTokens[mode],
        });
        pushFeedback(
          result.ok ? "success" : "error",
          result.ok
            ? mode === "archive_completed"
              ? orderMaintenance("archiveSuccess")
              : mode === "clear_active"
                ? orderMaintenance("clearSuccess")
                : orderMaintenance("deleteSuccess")
            : result.message
        );

        if (result.ok) {
          setMaintenancePreview((current) => ({
            ...current,
            [mode]: null,
          }));
          setMaintenancePreviewTokens((current) => ({
            ...current,
            [mode]: "",
          }));
          setMaintenanceConfirmation((current) => ({
            ...current,
            [mode]: false,
          }));
          refreshPage();
        } else if (typeof result.count === "number") {
          setMaintenancePreview((current) => ({
            ...current,
            [mode]: result.count,
          }));
        }

        if (result.requiresPreview) {
          setMaintenancePreviewTokens((current) => ({
            ...current,
            [mode]: "",
          }));
          setMaintenanceConfirmation((current) => ({
            ...current,
            [mode]: false,
          }));
        }
      }
    );

  const handleRotateLink = () => {
    runPendingAction("updating", async () => {
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
      pushFeedback("error", settingsCopy("copyUnavailable"));
      return;
    }

    try {
      await navigator.clipboard.writeText(orderEntryFullUrl);
      pushFeedback("success", settingsCopy("copySuccess"));
    } catch {
      pushFeedback("error", orderEntryFullUrl);
    }
  };

  const handleSendOrderEntryLinkEmail = () => {
    runPendingAction("saving", async () => {
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
    runPendingAction("updating", async () => {
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
    runPendingAction("updating", async () => {
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
    runPendingAction("updating", async () => {
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
    runPendingAction("updating", async () => {
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
    if (!window.confirm(settingsCopy("userDelete"))) {
      return;
    }

    runPendingAction("updating", async () => {
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
      <AdminActionPendingBar active={isPending} label={loading(pendingAction)} />
      <AdminPageHeader
        eyebrow={settingsCopy("title")}
        title={settingsCopy("title")}
        description={settingsCopy("description")}
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
          <p className="font-semibold">{settingsCopy("diagnosticsTitle")}</p>
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
          title={settingsCopy("notificationTitle")}
          description={diagnosticsReady ? undefined : initialSettings.diagnostics.message ?? undefined}
          action={
            <AdminButton
              variant="primary"
              onClick={handleSaveNotifications}
              disabled={isPending || !diagnosticsReady}
            >
              {settingsCopy("save")}
            </AdminButton>
          }
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminInput
              id="adminNotificationEmail"
              name="adminNotificationEmail"
              type="email"
              label={settingsCopy("adminEmail")}
              value={adminNotificationEmail}
              requiredLabel={requiredLabel}
              placeholder="service@goldhelwah.de"
              onChange={(event) => setAdminNotificationEmail(event.target.value)}
            />
            <AdminInput
              id="supportNotificationEmail"
              name="supportNotificationEmail"
              type="email"
              label={settingsCopy("supportEmail")}
              value={supportNotificationEmail}
              placeholder="support@goldhelwah.de"
              onChange={(event) => setSupportNotificationEmail(event.target.value)}
            />
            <div className="xl:col-span-2">
              <AdminInput
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                label={settingsCopy("ownerEmail")}
                value={ownerEmail}
                placeholder="owner@goldhelwah.de"
                onChange={(event) => setOwnerEmail(event.target.value)}
              />
            </div>
          </div>
        </AdminCard>

        <AdminCard title={settingsCopy("smtpTitle")}>
          <div className="space-y-4">
            <AdminBadge variant={initialSettings.smtpStatus.configured ? "success" : "danger"}>
              {initialSettings.smtpStatus.configured ? settingsCopy("smtpConfigured") : settingsCopy("smtpMissing")}
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
          title={settingsCopy("orderEntryTitle")}
          description={settingsCopy("orderEntryDescription")}
          action={
            <div className="flex gap-2">
              <AdminButton
                variant="secondary"
                onClick={handleSaveOrderEntry}
                disabled={isPending || !diagnosticsReady}
              >
                {settingsCopy("save")}
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={handleRotateLink}
                disabled={isPending || !diagnosticsReady}
              >
                {settingsCopy("rotateLink")}
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
              {settingsCopy("orderEntryEnabled")}
            </label>

            <AdminInput
              id="orderEntryExpiresAt"
              name="orderEntryExpiresAt"
              type="datetime-local"
              label={settingsCopy("expiresAt")}
              value={orderEntryExpiresAt}
              onChange={(event) => setOrderEntryExpiresAt(event.target.value)}
            />

            {orderEntryFullUrl ? (
              <AdminInput
                id="orderEntryFullUrl"
                name="orderEntryFullUrl"
                label={settingsCopy("fullLinkLabel")}
                value={orderEntryFullUrl}
                helperText={settingsCopy("fullLinkHelp")}
                readOnly
                className="font-mono text-xs"
              />
            ) : (
              <p className="text-sm text-muted">{settingsCopy("linkDisabled")}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={handleCopyOrderEntryLink}
                disabled={!orderEntryFullUrl}
              >
                {settingsCopy("copyLink")}
              </AdminButton>
              <AdminBadge variant={orderEntryEnabled ? "success" : "neutral"}>
                {orderEntryEnabled ? settingsCopy("statusEnabled") : settingsCopy("statusDisabled")}
              </AdminBadge>
              {initialSettings.orderEntryRotatedAt ? (
                <AdminBadge variant="info">
                  {settingsCopy("rotatedAt")}:{" "}
                  {initialSettings.orderEntryRotatedAt.slice(0, 16).replace("T", " ")}
                </AdminBadge>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <AdminInput
                id="orderEntryRecipientEmail"
                name="orderEntryRecipientEmail"
                type="email"
                label={settingsCopy("linkRecipient")}
                value={linkRecipientEmail}
                helperText={settingsCopy("linkRecipientHelp")}
                placeholder="email@example.com"
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
                {settingsCopy("sendLink")}
              </AdminButton>
            </div>
          </div>
        </AdminCard>

      </section>

      <section className="space-y-6">
        <AdminCard title={siteImagesCopy("title")} description={siteImagesCopy("description")}>
          <div className="space-y-4">
            <div className="grid gap-5 lg:grid-cols-3">
              {SITE_IMAGE_SLOTS.map((slot) => {
                const previewUrl = siteImagePreviewUrls[slot];
                const hasPreview = previewUrl.trim().length > 0;

                return (
                  <article
                    key={slot}
                    className="space-y-3 rounded-[1rem] border border-white/10 bg-white/4 p-4"
                  >
                    <div className="relative h-40 overflow-hidden rounded-[1rem] border border-white/8 bg-black/30">
                      <LuxuryMedia
                        src={previewUrl || undefined}
                        alt={getSiteImageLabel(slot)}
                        sizes="(max-width: 1024px) 100vw, 30vw"
                        fallbackContent={
                          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted">
                            {siteImagesCopy("usesDefault")}
                          </div>
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{getSiteImageLabel(slot)}</p>
                      <p className="text-sm text-muted">
                        {hasPreview
                          ? siteImagesCopy("currentImage")
                          : siteImagesCopy("usesDefault")}
                      </p>
                    </div>

                    <input
                      ref={(node) => {
                        fileInputRefs.current[slot] = node;
                      }}
                      type="file"
                      accept={STATIC_SITE_IMAGE_INPUT_ACCEPT}
                      className="hidden"
                      onChange={(event) => handleSiteImageUpload(slot, event)}
                    />

                    <div className="flex flex-wrap gap-2">
                      <AdminButton
                        size="sm"
                        variant="primary"
                        onClick={() => fileInputRefs.current[slot]?.click()}
                        disabled={isPending || !diagnosticsReady}
                      >
                        {hasPreview ? siteImagesCopy("replace") : siteImagesCopy("upload")}
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSiteImageReset(slot)}
                        disabled={isPending || !diagnosticsReady || !hasPreview}
                      >
                        {siteImagesCopy("reset")}
                      </AdminButton>
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="text-sm text-muted">{siteImagesCopy("productsExcluded")}</p>
          </div>
        </AdminCard>

        <AdminCard
          title={publicVisuals("title")}
          description={publicVisuals("description")}
          action={
            <AdminButton
              variant="primary"
              onClick={handleSavePublicVisuals}
              disabled={isPending || !diagnosticsReady}
            >
              {isPending && pendingAction === "saving"
                ? loading("saving")
                : publicVisuals("save")}
            </AdminButton>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={promo.enabled}
                onChange={(event) => setPromo({ ...promo, enabled: event.target.checked })}
              />
              {publicVisuals("enabled")}
            </label>
            <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={promo.showOnce}
                onChange={(event) => setPromo({ ...promo, showOnce: event.target.checked })}
              />
              {publicVisuals("showOnce")}
            </label>
            <AdminInput
              id="promoTitle"
              name="promoTitle"
              label={publicVisuals("promoTitle")}
              value={promo.title}
              onChange={(event) => setPromo({ ...promo, title: event.target.value })}
            />
            <AdminInput
              id="promoCtaText"
              name="promoCtaText"
              label={publicVisuals("ctaText")}
              value={promo.ctaText}
              onChange={(event) => setPromo({ ...promo, ctaText: event.target.value })}
            />
            <AdminInput
              id="promoDescription"
              name="promoDescription"
              label={publicVisuals("promoDescription")}
              value={promo.description}
              onChange={(event) => setPromo({ ...promo, description: event.target.value })}
            />
            <AdminInput
              id="promoCtaUrl"
              name="promoCtaUrl"
              label={publicVisuals("ctaUrl")}
              value={promo.ctaUrl}
              placeholder="https://..."
              onChange={(event) => setPromo({ ...promo, ctaUrl: event.target.value })}
            />
            <AdminInput
              id="promoVideoUrl"
              name="promoVideoUrl"
              label={publicVisuals("videoUrl")}
              value={promo.videoUrl}
              placeholder="https://..."
              onChange={(event) => setPromo({ ...promo, videoUrl: event.target.value })}
            />
            <AdminInput
              id="promoStartsAt"
              name="promoStartsAt"
              type="datetime-local"
              label={publicVisuals("start")}
              value={toLocalDateTimeInput(promo.startsAt)}
              onChange={(event) =>
                setPromo({ ...promo, startsAt: fromLocalDateTimeInput(event.target.value) })
              }
            />
            <AdminInput
              id="promoEndsAt"
              name="promoEndsAt"
              type="datetime-local"
              label={publicVisuals("end")}
              value={toLocalDateTimeInput(promo.endsAt)}
              onChange={(event) =>
                setPromo({ ...promo, endsAt: fromLocalDateTimeInput(event.target.value) })
              }
            />
            <AdminSelect
              id="promoStyle"
              name="promoStyle"
              label={publicVisuals("style")}
              value={promo.style}
              onChange={(event) =>
                setPromo({ ...promo, style: event.target.value as typeof promo.style })
              }
            >
              <option value="luxury">{publicVisuals("luxury")}</option>
              <option value="image">{publicVisuals("image")}</option>
              <option value="announcement">{publicVisuals("announcement")}</option>
            </AdminSelect>
          </div>
        </AdminCard>
      </section>

      {canManageUsers ? (
        <AdminCard title={orderMaintenance("title")} description={orderMaintenance("description")}>
          <div className="space-y-4">
            <p className="text-sm text-muted">{orderMaintenance("excludedNote")}</p>
            <p className="text-sm text-muted">{orderMaintenance("auditRequired")}</p>

            <div className="grid gap-5 lg:grid-cols-3">
              {([
                {
                  description: orderMaintenance("archiveDescription"),
                  mode: "archive_completed" as const,
                  title: orderMaintenance("archiveCompleted"),
                  variant: "secondary" as const,
                },
                {
                  description: orderMaintenance("clearDescription"),
                  mode: "clear_active" as const,
                  title: orderMaintenance("clearActive"),
                  variant: "danger" as const,
                },
                {
                  description: orderMaintenance("deleteDescription"),
                  mode: "delete_permanent" as const,
                  title: orderMaintenance("deletePermanent"),
                  variant: "danger" as const,
                },
              ]).map((item) => {
                const previewCount = maintenancePreview[item.mode];
                const confirmed = maintenanceConfirmation[item.mode];
                const missingPreviewToken =
                  item.mode === "delete_permanent" &&
                  !maintenancePreviewTokens[item.mode];

                return (
                  <article
                    key={item.mode}
                    className="space-y-3 rounded-[1rem] border border-white/10 bg-white/4 p-4"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted">{item.description}</p>
                    </div>

                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() => previewMaintenance(item.mode)}
                      disabled={isPending}
                    >
                      {orderMaintenance("preview")}
                    </AdminButton>

                    <p className="text-sm text-muted">
                      {orderMaintenance("affectedOrders")}: {previewCount ?? "-"}
                    </p>

                    <label className="rtl-inline-row flex items-start gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        disabled={isPending || previewCount === null || previewCount === 0}
                        onChange={(event) =>
                          setMaintenanceConfirmation((current) => ({
                            ...current,
                            [item.mode]: event.target.checked,
                          }))
                        }
                        className="mt-1 h-4 w-4 accent-[#c49a52]"
                      />
                      <span>{orderMaintenance("confirmCheckbox")}</span>
                    </label>

                    <AdminButton
                      variant={item.variant}
                      onClick={() => executeMaintenance(item.mode)}
                      disabled={
                        isPending ||
                        previewCount === null ||
                        previewCount === 0 ||
                        !confirmed ||
                        missingPreviewToken
                      }
                    >
                      {item.title}
                    </AdminButton>
                  </article>
                );
              })}
            </div>
          </div>
        </AdminCard>
      ) : null}
      <AdminCard
        title={settingsCopy("userListTitle")}
        description={!canManageUsers ? settingsCopy("manageUsersHint") : undefined}
        action={
          canManageUsers ? (
            <AdminButton variant="primary" onClick={handleUserSubmit} disabled={isPending}>
              {userFormState.id ? settingsCopy("userSave") : settingsCopy("userCreate")}
            </AdminButton>
          ) : undefined
        }
      >
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminInput
              id="userDisplayName"
              name="userDisplayName"
              label={settingsCopy("userDisplayName")}
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
              label={settingsCopy("role")}
              value={userFormState.role}
              onChange={(event) =>
                setUserFormState((current) => ({
                  ...current,
                  role: event.target.value as ManagedAdminRole,
                }))
              }
            >
              <option value="super_admin">{settingsCopy("roleOwner")}</option>
              <option value="admin">{settingsCopy("roleAdmin")}</option>
              <option value="employee">{settingsCopy("roleEmployee")}</option>
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
              {settingsCopy("userActive")}
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
                      {user.isActive ? settingsCopy("userActive") : userInactiveLabel}
                    </AdminBadge>
                    <AdminBadge variant="info">{user.role === "super_admin" ? settingsCopy("roleOwner") : user.role === "admin" ? settingsCopy("roleAdmin") : settingsCopy("roleEmployee")}</AdminBadge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    onClick={() => setUserFormState(createUserEditForm(user))}
                    disabled={!canManageUsers || isPending}
                  >
                    {settingsCopy("userEdit")}
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUserInvite(user)}
                    disabled={!canManageUsers || isPending}
                  >
                    {settingsCopy("inviteAgain")}
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
                      {settingsCopy("userDelete")}
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
