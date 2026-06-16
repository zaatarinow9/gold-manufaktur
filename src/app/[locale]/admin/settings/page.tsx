"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { getCurrentAdminUser, hasAdminRoleAccess } from "@/lib/admin/currentUser";
import { companyInfo } from "@/lib/site";

type SettingsFormState = {
  address: string;
  companyName: string;
  contactFormStatus: string;
  dashboardTheme: string;
  defaultLanguage: string;
  demoRole: string;
  density: string;
  email: string;
  legalNotice: string;
  phone: string;
  privacyPolicy: string;
  sidebarMode: string;
};

const initialSettings: SettingsFormState = {
  address: companyInfo.address,
  companyName: companyInfo.name,
  contactFormStatus: "active",
  dashboardTheme: "luxury-dark",
  defaultLanguage: "de",
  demoRole: "super_admin",
  density: "comfortable",
  email: companyInfo.emailDisplay,
  legalNotice: "Impressum folgt nach finaler rechtlicher Prüfung.",
  phone: companyInfo.phoneDisplay,
  privacyPolicy: "Datenschutzhinweis folgt nach finaler rechtlicher Prüfung.",
  sidebarMode: "expanded",
};

export default function AdminSettingsPage() {
  const t = useTranslations("Admin");
  const currentUser = getCurrentAdminUser();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [settings, setSettings] = useState(initialSettings);

  if (!hasAdminRoleAccess(currentUser, ["super_admin"])) {
    return (
      <AdminCard title={t("common.noAccessTitle")} description={t("common.noAccessText")} />
    );
  }

  const updateField = <Key extends keyof SettingsFormState>(
    key: Key,
    value: SettingsFormState[Key]
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setFeedback(t("settings.saveMessage"));
      }}
    >
      <AdminPageHeader
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.description")}
        actions={
          <>
            <AdminButton
              variant="ghost"
              onClick={() => setFeedback(t("settings.previewMessage"))}
            >
              {t("buttons.preview")}
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => {
                setSettings(initialSettings);
                setFeedback(t("settings.resetMessage"));
              }}
            >
              {t("buttons.reset")}
            </AdminButton>
            <AdminButton type="submit" variant="primary">
              {t("buttons.save")}
            </AdminButton>
          </>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminCard title={t("settings.companyTitle")} description={t("settings.companyDescription")}>
          <div className="grid gap-4">
            <AdminInput
              label={t("settings.fields.companyName")}
              value={settings.companyName}
              onChange={(event) => updateField("companyName", event.target.value)}
            />
            <AdminInput
              label={t("settings.fields.address")}
              value={settings.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
            <AdminInput
              label={t("settings.fields.phone")}
              value={settings.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
            <AdminInput
              label={t("settings.fields.email")}
              value={settings.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder={companyInfo.emailDisplay}
            />
          </div>
        </AdminCard>

        <AdminCard title={t("settings.websiteTitle")} description={t("settings.websiteDescription")}>
          <div className="grid gap-4">
            <AdminSelect
              label={t("settings.fields.defaultLanguage")}
              value={settings.defaultLanguage}
              onChange={(event) => updateField("defaultLanguage", event.target.value)}
            >
              <option value="de">Deutsch</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="tr">Türkçe</option>
            </AdminSelect>
            <AdminSelect
              label={t("settings.fields.dashboardTheme")}
              value={settings.dashboardTheme}
              onChange={(event) => updateField("dashboardTheme", event.target.value)}
            >
              <option value="luxury-dark">{t("settings.values.luxuryDark")}</option>
              <option value="soft-gold">{t("settings.values.softGold")}</option>
            </AdminSelect>
            <AdminSelect
              label={t("settings.fields.contactFormStatus")}
              value={settings.contactFormStatus}
              onChange={(event) => updateField("contactFormStatus", event.target.value)}
            >
              <option value="active">{t("common.active")}</option>
              <option value="inactive">{t("common.inactive")}</option>
            </AdminSelect>
          </div>
        </AdminCard>

        <AdminCard title={t("settings.dashboardTitle")} description={t("settings.dashboardDescription")}>
          <div className="grid gap-4">
            <AdminSelect
              label={t("settings.fields.demoRole")}
              value={settings.demoRole}
              onChange={(event) => updateField("demoRole", event.target.value)}
            >
              <option value="super_admin">{t("roles.super_admin")}</option>
              <option value="admin">{t("roles.admin")}</option>
              <option value="employee">{t("roles.employee")}</option>
            </AdminSelect>
            <AdminSelect
              label={t("settings.fields.sidebarMode")}
              value={settings.sidebarMode}
              onChange={(event) => updateField("sidebarMode", event.target.value)}
            >
              <option value="expanded">{t("settings.values.expanded")}</option>
              <option value="compact">{t("settings.values.compact")}</option>
            </AdminSelect>
            <AdminSelect
              label={t("settings.fields.density")}
              value={settings.density}
              onChange={(event) => updateField("density", event.target.value)}
            >
              <option value="comfortable">{t("settings.values.comfortable")}</option>
              <option value="compact">{t("settings.values.compactDensity")}</option>
            </AdminSelect>
          </div>
        </AdminCard>

        <AdminCard title={t("settings.legalTitle")} description={t("settings.legalDescription")}>
          <div className="grid gap-4">
            <label>
              <span className="admin-label">{t("settings.fields.legalNotice")}</span>
              <textarea
                className="admin-textarea"
                value={settings.legalNotice}
                onChange={(event) => updateField("legalNotice", event.target.value)}
              />
            </label>
            <label>
              <span className="admin-label">{t("settings.fields.privacyPolicy")}</span>
              <textarea
                className="admin-textarea"
                value={settings.privacyPolicy}
                onChange={(event) => updateField("privacyPolicy", event.target.value)}
              />
            </label>
          </div>
        </AdminCard>
      </section>
    </form>
  );
}
