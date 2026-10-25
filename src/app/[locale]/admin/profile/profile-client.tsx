"use client";

import { Camera, KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { changeMyPasswordAction, updateMyNameAction } from "@/app/[locale]/admin/profile/actions";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { AppLocale } from "@/i18n/routing";
import type { AdminRole } from "@/types/admin";

type Props = {
  avatarLabel: string;
  avatarUrl: string;
  email: string;
  isManager: boolean;
  locale: AppLocale;
  name: string;
  role: AdminRole;
};

type Feedback = { message: string; ok: boolean } | null;

export function ProfileClient({ avatarLabel, avatarUrl, email, isManager, locale, name, role }: Props) {
  const t = useTranslations("Admin.profile");
  const tr = useTranslations("Admin.roles");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [photo, setPhoto] = useState(avatarUrl);
  const [displayName, setDisplayName] = useState(name);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [photoFeedback, setPhotoFeedback] = useState<Feedback>(null);
  const [nameFeedback, setNameFeedback] = useState<Feedback>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  const upload = (file: File) =>
    startTransition(async () => {
      setPhotoFeedback(null);
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/profile-avatar", { body, method: "POST" });
      const result = (await response.json().catch(() => ({}))) as { avatarUrl?: string; error?: string };
      if (!response.ok || !result.avatarUrl) {
        setPhotoFeedback({ message: result.error === "FILE_TOO_LARGE" || result.error === "INVALID_FILE_TYPE" ? t("photoInvalid") : t("photoFailed"), ok: false });
        return;
      }
      setPhoto(result.avatarUrl);
      setPhotoFeedback({ message: t("photoSaved"), ok: true });
      router.refresh();
    });

  const removePhoto = () =>
    startTransition(async () => {
      const response = await fetch("/api/admin/profile-avatar", { method: "DELETE" });
      if (response.ok) {
        setPhoto("");
        setPhotoFeedback({ message: t("photoRemoved"), ok: true });
        router.refresh();
      } else {
        setPhotoFeedback({ message: t("photoFailed"), ok: false });
      }
    });

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard title={t("photoTitle")} description={t("photoHint")}>
          <div className="flex flex-wrap items-center gap-5">
            <AdminAvatar label={avatarLabel} url={photo} size="lg" />
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) upload(file);
                }}
              />
              <AdminButton variant="secondary" disabled={pending} onClick={() => fileRef.current?.click()}>
                <Camera />
                {photo ? t("photoChange") : t("photoUpload")}
              </AdminButton>
              {photo ? (
                <AdminButton variant="ghost" disabled={pending} onClick={removePhoto}>
                  <Trash2 />
                  {t("photoRemove")}
                </AdminButton>
              ) : null}
            </div>
          </div>
          {photoFeedback ? (
            <p role="status" className={photoFeedback.ok ? "mt-4 text-sm text-emerald-300" : "mt-4 text-sm text-rose-300"}>
              {photoFeedback.message}
            </p>
          ) : null}
        </AdminCard>

        <AdminCard title={t("detailsTitle")}>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await updateMyNameAction(locale, displayName);
                setNameFeedback(result);
                if (result.ok) router.refresh();
              });
            }}
          >
            <AdminInput label={t("name")} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            <AdminInput label={t("email")} dir="ltr" value={email} readOnly disabled helperText={t("emailHint")} />
            <p className="text-sm text-muted">
              {t("role")}: <span className="text-foreground">{isManager ? tr("workshop_manager") : tr(role)}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <AdminButton type="submit" variant="primary" disabled={pending || displayName.trim().length < 2 || displayName.trim() === name}>
                {t("save")}
              </AdminButton>
              {nameFeedback ? (
                <span role="status" className={nameFeedback.ok ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>
                  {nameFeedback.message}
                </span>
              ) : null}
            </div>
          </form>
        </AdminCard>

        <AdminCard title={t("passwordTitle")} description={t("passwordHint")}>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (password !== confirmation) {
                setPasswordFeedback({ message: t("passwordMismatch"), ok: false });
                return;
              }
              startTransition(async () => {
                const result = await changeMyPasswordAction(locale, password);
                setPasswordFeedback(result);
                if (result.ok) {
                  setPassword("");
                  setConfirmation("");
                }
              });
            }}
          >
            <AdminInput label={t("newPassword")} type="password" autoComplete="new-password" dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} />
            <AdminInput label={t("confirmPassword")} type="password" autoComplete="new-password" dir="ltr" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            <div className="flex flex-wrap items-center gap-3">
              <AdminButton type="submit" variant="secondary" disabled={pending || password.length < 8}>
                <KeyRound />
                {t("passwordSave")}
              </AdminButton>
              {passwordFeedback ? (
                <span role="status" className={passwordFeedback.ok ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>
                  {passwordFeedback.message}
                </span>
              ) : null}
            </div>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}
