"use client";

import {
  type ChangeEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  AlertTriangle,
  BellOff,
  Copy,
  Database,
  Globe,
  KeyRound,
  Link2,
  type LucideIcon,
  Mail,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  createManagedAdminUserAction,
  deleteManagedAdminUserAction,
  resendManagedAdminInviteAction,
  rotateOrderEntryAccessAction,
  saveNotificationSettingsAction,
  saveOrderEntrySettingsAction,
  savePublicVisualSettingsAction,
  sendManagedAdminPasswordResetAction,
  sendOrderEntryLinkEmailAction,
  toggleManagedAdminUserActiveAction,
  updateManagedAdminUserAction,
} from "@/app/[locale]/admin/settings/actions";
import {
  getOrderResetCountAction,
  resetOrdersToColdArchiveAction,
} from "@/app/[locale]/admin/settings/order-reset-actions";
import { clearNotificationsAction } from "@/app/[locale]/admin/notification-actions";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { useAdminConfirm } from "@/components/admin/AdminConfirm";
import { AdminDrawer, AdminFormSection } from "@/components/admin/AdminDrawer";
import { AdminActionPendingBar } from "@/components/admin/AdminActionPendingBar";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminSwitch } from "@/components/admin/AdminSwitch";
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
  | "executing"
  | "uploading"
  | "resetting";

type SiteImageResponse = {
  error?: string;
  image?: StaticSiteImageRecord | null;
  success: boolean;
};

type SettingsSection = "access" | "data" | "emails" | "orderLink" | "website";

const settingsSections: SettingsSection[] = ["website", "emails", "orderLink", "access", "data"];

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
  const orderReset = useTranslations("Admin.orderReset");
  const loading = useTranslations("Admin.loading");
  const siteImagesCopy = useTranslations("Admin.siteImages");
  const publicVisuals = useTranslations("PublicVisuals");
  const sectionCopy = useTranslations("Admin.settingsSections");
  const dataCopy = useTranslations("Admin.settingsData");
  const confirm = useAdminConfirm();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section") as SettingsSection | null;
  const [section, setSection] = useState<SettingsSection>(
    requestedSection && settingsSections.includes(requestedSection) ? requestedSection : "website"
  );
  const [userEditorOpen, setUserEditorOpen] = useState(false);

  const selectSection = (next: SettingsSection) => {
    setSection(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("section", next);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // Remembering the section in the address bar is a convenience only.
    }
  };
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
  const [orderResetCount, setOrderResetCount] = useState<number | null>(null);
  const [orderResetConfirmed, setOrderResetConfirmed] = useState(false);
  const [orderResetOpen, setOrderResetOpen] = useState(false);
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

  const openOrderReset = () => runPendingAction("resetting", async () => {
    const result = await getOrderResetCountAction(locale);
    if (!result.ok) return pushFeedback("error", orderReset("genericError"));
    if (result.count === 0) return pushFeedback("error", orderReset("noOrders"));
    setOrderResetCount(result.count);
    setOrderResetConfirmed(false);
    setOrderResetOpen(true);
  });

  const executeOrderReset = () => runPendingAction("resetting", async () => {
    const result = await resetOrdersToColdArchiveAction(locale, { confirmed: true });
    pushFeedback(result.ok ? "success" : "error", result.ok ? orderReset("success") : orderReset("genericError"));
    if (result.ok) {
      setOrderResetOpen(false);
      setOrderResetCount(null);
      setOrderResetConfirmed(false);
      refreshPage();
    }
  });

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
        setUserEditorOpen(false);
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

  const handleUserDelete = async (user: ManagedAdminUserRecord) => {
    const confirmed = await confirm({
      description: settingsCopy("userDeleteText"),
      title: settingsCopy("userDeleteConfirm", { name: user.displayName || user.email }),
    });
    if (!confirmed) {
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

  const handleClearNotifications = async () => {
    const confirmed = await confirm({
      confirmLabel: dataCopy("clearNotificationsButton"),
      description: dataCopy("clearNotificationsText"),
      title: dataCopy("clearNotificationsConfirm"),
    });
    if (!confirmed) return;
    runPendingAction("executing", async () => {
      const result = await clearNotificationsAction(locale);
      pushFeedback(result.ok ? "success" : "error", result.message);
      if (result.ok) refreshPage();
    });
  };

  const sections: { icon: LucideIcon; id: SettingsSection; label: string }[] = [
    { icon: Globe, id: "website", label: sectionCopy("website") },
    { icon: Mail, id: "emails", label: sectionCopy("emails") },
    { icon: Link2, id: "orderLink", label: sectionCopy("orderLink") },
    ...(canManageUsers
      ? [
          { icon: Users, id: "access" as const, label: sectionCopy("access") },
          { icon: Database, id: "data" as const, label: sectionCopy("data") },
        ]
      : []),
  ];

  const renderSiteImage = (slot: StaticSiteImageSlot, label: string, hint: string) => {
    const previewUrl = siteImagePreviewUrls[slot];
    const hasPreview = previewUrl.trim().length > 0;
    return (
      <div key={slot} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative aspect-[16/10] w-40 shrink-0 overflow-hidden rounded-[0.75rem] border border-white/8 bg-black/30 sm:w-48">
          <LuxuryMedia
            src={previewUrl || undefined}
            alt={label}
            sizes="(max-width: 640px) 100vw, 12rem"
            fallbackContent={
              <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted">
                {siteImagesCopy("usesDefault")}
              </div>
            }
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-sm text-muted">{hasPreview ? siteImagesCopy("currentImage") : hint}</p>
          <input
            ref={(node) => {
              fileInputRefs.current[slot] = node;
            }}
            type="file"
            accept={STATIC_SITE_IMAGE_INPUT_ACCEPT}
            className="hidden"
            onChange={(event) => handleSiteImageUpload(slot, event)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => fileInputRefs.current[slot]?.click()}
              disabled={isPending || !diagnosticsReady}
            >
              <Upload />
              {hasPreview ? siteImagesCopy("replace") : siteImagesCopy("upload")}
            </AdminButton>
            {hasPreview ? (
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={() => handleSiteImageReset(slot)}
                disabled={isPending || !diagnosticsReady}
              >
                {siteImagesCopy("reset")}
              </AdminButton>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AdminActionPendingBar active={isPending} label={pendingAction === "resetting" ? orderReset("processing") : loading(pendingAction)} />
      <AdminPageHeader title={settingsCopy("title")} description={settingsCopy("description")} />

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.kind} role="status">
          {feedback.message}
        </div>
      ) : null}

      {!diagnosticsReady ? (
        <div className="admin-notice" data-tone="error">
          <p className="font-semibold">{settingsCopy("diagnosticsTitle")}</p>
          <p className="mt-1">{initialSettings.diagnostics.message}</p>
          <div className="mt-2 space-y-0.5 text-xs opacity-90">
            <p>{`${diagnosticsEnvironmentLabel}: ${initialSettings.diagnostics.environmentLabel}`}</p>
            <p>{`${diagnosticsSiteUrlLabel}: ${initialSettings.diagnostics.siteBaseUrl}`}</p>
            {initialSettings.diagnostics.missingEnvVars.length > 0 ? (
              <p>{`${diagnosticsMissingEnvLabel}: ${initialSettings.diagnostics.missingEnvVars.join(", ")}`}</p>
            ) : null}
            {initialSettings.diagnostics.suggestedMigration ? (
              <p>{`${diagnosticsMigrationLabel}: ${initialSettings.diagnostics.suggestedMigration}`}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {usersWarning ? (
        <div className="admin-notice" data-tone="warning">
          {usersWarning}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label={settingsCopy("title")} className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {sections.map((item) => (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={section === item.id ? "page" : undefined}
                  onClick={() => selectSection(item.id)}
                  className="admin-nav-link w-full whitespace-nowrap"
                >
                  <item.icon />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          {section === "website" ? (
            <>
              <AdminCard title={sectionCopy("imagesTitle")} description={sectionCopy("imagesText")}>
                <div className="space-y-5 divide-y divide-white/[0.05] [&>*+*]:pt-5">
                  {renderSiteImage("homepageHero", siteImagesCopy("homepageHero"), sectionCopy("homeHeroHint"))}
                  {renderSiteImage("shopHero", siteImagesCopy("shopHero"), sectionCopy("shopHeroHint"))}
                </div>
                <p className="mt-5 text-sm text-text-soft">{siteImagesCopy("productsExcluded")}</p>
              </AdminCard>

              <AdminCard
                title={sectionCopy("promoTitle")}
                description={sectionCopy("promoText")}
                action={
                  <AdminButton variant="primary" onClick={handleSavePublicVisuals} disabled={isPending || !diagnosticsReady}>
                    {isPending && pendingAction === "saving" ? loading("saving") : publicVisuals("save")}
                  </AdminButton>
                }
              >
                <div className="space-y-6">
                  <AdminSwitch
                    checked={promo.enabled}
                    onChange={(checked) => setPromo({ ...promo, enabled: checked })}
                    label={publicVisuals("enabled")}
                    description={sectionCopy("promoEnabledHint")}
                  />

                  <div className={promo.enabled ? "space-y-6" : "space-y-6 opacity-60"}>
                    <AdminFormSection title={sectionCopy("promoContent")}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <AdminInput
                          id="promoTitle"
                          label={publicVisuals("promoTitle")}
                          value={promo.title}
                          onChange={(event) => setPromo({ ...promo, title: event.target.value })}
                        />
                        <AdminInput
                          id="promoDescription"
                          label={publicVisuals("promoDescription")}
                          value={promo.description}
                          onChange={(event) => setPromo({ ...promo, description: event.target.value })}
                        />
                        <AdminInput
                          id="promoCtaText"
                          label={publicVisuals("ctaText")}
                          value={promo.ctaText}
                          onChange={(event) => setPromo({ ...promo, ctaText: event.target.value })}
                        />
                        <AdminInput
                          id="promoCtaUrl"
                          label={publicVisuals("ctaUrl")}
                          dir="ltr"
                          value={promo.ctaUrl}
                          placeholder="https://..."
                          onChange={(event) => setPromo({ ...promo, ctaUrl: event.target.value })}
                        />
                      </div>
                    </AdminFormSection>

                    <AdminFormSection title={sectionCopy("promoLook")}>
                      <div className="space-y-5">
                        {renderSiteImage("promoPopupImage", siteImagesCopy("promoPopup"), sectionCopy("promoImageHint"))}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <AdminSelect
                            id="promoStyle"
                            label={publicVisuals("style")}
                            value={promo.style}
                            onChange={(event) => setPromo({ ...promo, style: event.target.value as typeof promo.style })}
                          >
                            <option value="luxury">{publicVisuals("luxury")}</option>
                            <option value="image">{publicVisuals("image")}</option>
                            <option value="announcement">{publicVisuals("announcement")}</option>
                          </AdminSelect>
                          <AdminInput
                            id="promoVideoUrl"
                            label={publicVisuals("videoUrl")}
                            dir="ltr"
                            value={promo.videoUrl}
                            placeholder="https://..."
                            onChange={(event) => setPromo({ ...promo, videoUrl: event.target.value })}
                          />
                        </div>
                      </div>
                    </AdminFormSection>

                    <AdminFormSection title={sectionCopy("promoWhen")}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <AdminInput
                          id="promoStartsAt"
                          type="datetime-local"
                          label={publicVisuals("start")}
                          value={toLocalDateTimeInput(promo.startsAt)}
                          onChange={(event) => setPromo({ ...promo, startsAt: fromLocalDateTimeInput(event.target.value) })}
                        />
                        <AdminInput
                          id="promoEndsAt"
                          type="datetime-local"
                          label={publicVisuals("end")}
                          value={toLocalDateTimeInput(promo.endsAt)}
                          onChange={(event) => setPromo({ ...promo, endsAt: fromLocalDateTimeInput(event.target.value) })}
                        />
                      </div>
                      <div className="mt-4">
                        <AdminSwitch
                          checked={promo.showOnce}
                          onChange={(checked) => setPromo({ ...promo, showOnce: checked })}
                          label={publicVisuals("showOnce")}
                        />
                      </div>
                    </AdminFormSection>
                  </div>
                </div>
              </AdminCard>
            </>
          ) : null}

          {section === "emails" ? (
            <>
              <AdminCard
                title={settingsCopy("notificationTitle")}
                description={sectionCopy("emailsText")}
                action={
                  <AdminButton variant="primary" onClick={handleSaveNotifications} disabled={isPending || !diagnosticsReady}>
                    {settingsCopy("save")}
                  </AdminButton>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminInput
                    id="adminNotificationEmail"
                    type="email"
                    dir="ltr"
                    label={settingsCopy("adminEmail")}
                    helperText={sectionCopy("adminEmailHint")}
                    value={adminNotificationEmail}
                    placeholder="service@goldhelwah.de"
                    onChange={(event) => setAdminNotificationEmail(event.target.value)}
                  />
                  <AdminInput
                    id="supportNotificationEmail"
                    type="email"
                    dir="ltr"
                    label={settingsCopy("supportEmail")}
                    helperText={sectionCopy("supportEmailHint")}
                    value={supportNotificationEmail}
                    placeholder="support@goldhelwah.de"
                    onChange={(event) => setSupportNotificationEmail(event.target.value)}
                  />
                  <AdminInput
                    id="ownerEmail"
                    type="email"
                    dir="ltr"
                    wrapperClassName="sm:col-span-2"
                    label={settingsCopy("ownerEmail")}
                    helperText={sectionCopy("ownerEmailHint")}
                    value={ownerEmail}
                    placeholder="owner@goldhelwah.de"
                    onChange={(event) => setOwnerEmail(event.target.value)}
                  />
                </div>
              </AdminCard>

              <AdminCard title={settingsCopy("smtpTitle")}>
                <div className="flex flex-wrap items-center gap-3">
                  <AdminBadge variant={initialSettings.smtpStatus.configured ? "success" : "danger"}>
                    {initialSettings.smtpStatus.configured ? settingsCopy("smtpConfigured") : settingsCopy("smtpMissing")}
                  </AdminBadge>
                  <p className="text-sm text-muted">
                    <bdi>{`${initialSettings.smtpStatus.fromName} <${initialSettings.smtpStatus.fromAddress || "–"}>`}</bdi>
                  </p>
                </div>
                {initialSettings.smtpStatus.missing.length > 0 ? (
                  <p className="mt-3 text-sm text-muted">{initialSettings.smtpStatus.missing.join(", ")}</p>
                ) : null}
              </AdminCard>
            </>
          ) : null}

          {section === "orderLink" ? (
            <AdminCard title={settingsCopy("orderEntryTitle")} description={sectionCopy("orderLinkText")}>
              <div className="space-y-6">
                <AdminSwitch
                  checked={orderEntryEnabled}
                  onChange={setOrderEntryEnabled}
                  label={settingsCopy("orderEntryEnabled")}
                  description={orderEntryEnabled ? settingsCopy("statusEnabled") : settingsCopy("linkDisabled")}
                />

                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <AdminInput
                    id="orderEntryExpiresAt"
                    type="datetime-local"
                    label={settingsCopy("expiresAt")}
                    helperText={sectionCopy("expiresHint")}
                    value={orderEntryExpiresAt}
                    onChange={(event) => setOrderEntryExpiresAt(event.target.value)}
                  />
                  <AdminButton variant="primary" onClick={handleSaveOrderEntry} disabled={isPending || !diagnosticsReady}>
                    {settingsCopy("save")}
                  </AdminButton>
                </div>

                {orderEntryEnabled && orderEntryFullUrl ? (
                  <AdminFormSection title={settingsCopy("fullLinkLabel")} hint={settingsCopy("fullLinkHelp")}>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input readOnly dir="ltr" className="admin-input font-mono text-xs" value={orderEntryFullUrl} aria-label={settingsCopy("fullLinkLabel")} />
                      <AdminButton variant="secondary" onClick={handleCopyOrderEntryLink}>
                        <Copy />
                        {settingsCopy("copyLink")}
                      </AdminButton>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <AdminInput
                        id="orderEntryRecipientEmail"
                        type="email"
                        dir="ltr"
                        label={settingsCopy("linkRecipient")}
                        helperText={settingsCopy("linkRecipientHelp")}
                        value={linkRecipientEmail}
                        placeholder="email@example.com"
                        onChange={(event) => setLinkRecipientEmail(event.target.value)}
                      />
                      <AdminButton
                        variant="secondary"
                        onClick={handleSendOrderEntryLinkEmail}
                        disabled={isPending || !diagnosticsReady || linkRecipientEmail.trim().length === 0}
                      >
                        <Send />
                        {settingsCopy("sendLink")}
                      </AdminButton>
                    </div>
                  </AdminFormSection>
                ) : null}

                <AdminFormSection title={settingsCopy("rotateLink")} hint={sectionCopy("rotateHint")}>
                  <div className="flex flex-wrap items-center gap-3">
                    <AdminButton
                      variant="ghost"
                      onClick={async () => {
                        const confirmed = await confirm({
                          confirmLabel: settingsCopy("rotateLink"),
                          danger: false,
                          description: sectionCopy("rotateHint"),
                          title: settingsCopy("rotateLink"),
                        });
                        if (confirmed) handleRotateLink();
                      }}
                      disabled={isPending || !diagnosticsReady}
                    >
                      <RefreshCw />
                      {settingsCopy("rotateLink")}
                    </AdminButton>
                    {initialSettings.orderEntryRotatedAt ? (
                      <span className="text-sm text-text-soft">
                        {settingsCopy("rotatedAt")}: {initialSettings.orderEntryRotatedAt.slice(0, 16).replace("T", " ")}
                      </span>
                    ) : null}
                  </div>
                </AdminFormSection>
              </div>
            </AdminCard>
          ) : null}

          {section === "access" && canManageUsers ? (
            <AdminCard
              title={settingsCopy("userListTitle")}
              description={sectionCopy("accessText")}
              action={
                <AdminButton
                  variant="primary"
                  onClick={() => {
                    setUserFormState(createUserForm());
                    setUserEditorOpen(true);
                  }}
                >
                  <Plus />
                  {settingsCopy("userCreate")}
                </AdminButton>
              }
              contentClassName="p-0"
            >
              <ul className="divide-y divide-white/[0.05]">
                {initialUsers.map((user) => (
                  <li key={user.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        {user.displayName || user.email}
                        {user.id === currentUserId ? <span className="text-xs text-text-soft">({sectionCopy("you")})</span> : null}
                      </p>
                      <p className="truncate text-sm text-muted">
                        <bdi>{user.email}</bdi>
                      </p>
                    </div>
                    <AdminBadge variant="info">
                      {user.role === "super_admin" ? settingsCopy("roleOwner") : user.role === "admin" ? settingsCopy("roleAdmin") : settingsCopy("roleEmployee")}
                    </AdminBadge>
                    {!user.isActive ? <AdminBadge variant="danger">{userInactiveLabel}</AdminBadge> : null}
                    <AdminActionMenu
                      label={settingsCopy("userActions", { name: user.displayName || user.email })}
                      items={[
                        {
                          icon: Pencil,
                          label: settingsCopy("userEdit"),
                          onSelect: () => {
                            setUserFormState(createUserEditForm(user));
                            setUserEditorOpen(true);
                          },
                        },
                        { icon: Mail, label: settingsCopy("inviteAgain"), onSelect: () => handleUserInvite(user) },
                        ...(user.isActive ? [{ icon: KeyRound, label: resetPasswordLabel, onSelect: () => handleUserPasswordReset(user) }] : []),
                        ...(user.id !== currentUserId
                          ? [
                              { icon: Power, label: user.isActive ? deactivateUserLabel : activateUserLabel, onSelect: () => handleUserToggle(user) },
                              { danger: true, icon: Trash2, label: settingsCopy("userDelete"), onSelect: () => void handleUserDelete(user) },
                            ]
                          : []),
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </AdminCard>
          ) : null}

          {section === "data" && canManageUsers ? (
            <>
              <AdminCard title={dataCopy("notificationsTitle")} description={dataCopy("notificationsText")}>
                <AdminButton variant="secondary" onClick={() => void handleClearNotifications()} disabled={isPending}>
                  <BellOff />
                  {dataCopy("clearNotificationsButton")}
                </AdminButton>
              </AdminCard>

              <section className="rounded-[1rem] border border-rose-400/25 bg-rose-400/[0.04] p-5">
                <h2 className="flex items-center gap-2 font-semibold text-rose-200">
                  <AlertTriangle className="h-4 w-4" />
                  {orderReset("title")}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted">{orderReset("description")}</p>
                <p className="mt-1 text-sm text-text-soft">{orderReset("excludedNote")}</p>
                <AdminButton className="mt-4" variant="danger" onClick={openOrderReset} disabled={isPending}>
                  {orderReset("button")}
                </AdminButton>
              </section>
            </>
          ) : null}
        </div>
      </div>

      {orderResetOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="order-reset-title">
          <div className="admin-drawer-backdrop" aria-hidden="true" />
          <div className="relative z-[91] w-full max-w-lg space-y-5 rounded-[1rem] border border-[var(--admin-line)] bg-[var(--admin-raised)] p-6 shadow-2xl">
            <div className="space-y-2">
              <h2 id="order-reset-title" className="text-lg font-semibold text-foreground">{orderReset("confirmTitle")}</h2>
              <p className="text-sm leading-6 text-muted">{orderReset("confirmDescription")}</p>
              <p className="text-sm font-medium text-foreground">
                {orderReset("currentOrderCount")}: {orderResetCount ?? 0}
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={orderResetConfirmed}
                disabled={isPending}
                onChange={(event) => setOrderResetConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 accent-[#c49a52]"
              />
              <span>{orderReset("confirmCheckbox")}</span>
            </label>
            <div className="flex flex-wrap justify-end gap-3">
              <AdminButton variant="ghost" onClick={() => setOrderResetOpen(false)} disabled={isPending}>
                {orderReset("cancel")}
              </AdminButton>
              <AdminButton variant="danger" onClick={executeOrderReset} disabled={isPending || !orderResetConfirmed}>
                {orderReset("confirm")}
              </AdminButton>
            </div>
          </div>
        </div>
      ) : null}

      <AdminDrawer
        open={userEditorOpen}
        onClose={() => setUserEditorOpen(false)}
        title={userFormState.id ? settingsCopy("userEdit") : settingsCopy("userCreate")}
        description={sectionCopy("userEditorText")}
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={() => setUserEditorOpen(false)}>
              {orderReset("cancel")}
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={handleUserSubmit}
              disabled={isPending || !userFormState.email.trim() || !userFormState.displayName.trim()}
            >
              {userFormState.id ? settingsCopy("userSave") : settingsCopy("userCreate")}
            </AdminButton>
          </div>
        }
      >
        <AdminFormSection title={settingsCopy("userListTitle")}>
          <div className="grid gap-4">
            <AdminInput
              id="userDisplayName"
              label={settingsCopy("userDisplayName")}
              required
              requiredLabel={requiredLabel}
              value={userFormState.displayName}
              onChange={(event) => setUserFormState((current) => ({ ...current, displayName: event.target.value }))}
            />
            <AdminInput
              id="userEmail"
              type="email"
              dir="ltr"
              label={userEmailLabel}
              required
              requiredLabel={requiredLabel}
              helperText={sectionCopy("userEmailHint")}
              value={userFormState.email}
              onChange={(event) => setUserFormState((current) => ({ ...current, email: event.target.value }))}
            />
            <AdminSelect
              id="userRole"
              label={settingsCopy("role")}
              helperText={sectionCopy(`roleHint.${userFormState.role}`)}
              value={userFormState.role}
              onChange={(event) => setUserFormState((current) => ({ ...current, role: event.target.value as ManagedAdminRole }))}
            >
              <option value="super_admin">{settingsCopy("roleOwner")}</option>
              <option value="admin">{settingsCopy("roleAdmin")}</option>
              <option value="employee">{settingsCopy("roleEmployee")}</option>
            </AdminSelect>
            <AdminSwitch
              checked={userFormState.isActive}
              onChange={(checked) => setUserFormState((current) => ({ ...current, isActive: checked }))}
              label={settingsCopy("userActive")}
            />
          </div>
        </AdminFormSection>
      </AdminDrawer>
    </div>
  );
}
