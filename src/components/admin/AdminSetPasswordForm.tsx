"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  setPasswordAction,
  type SetPasswordActionState,
} from "@/app/[locale]/admin/auth/set-password/actions";
import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
} from "@/lib/admin/clientForm";

import { AdminButton } from "./AdminButton";
import { AdminInput } from "./AdminInput";

type AdminSetPasswordFormProps = {
  locale: AppLocale;
  mode: "invite" | "password_reset";
  redirectTo?: string;
};

const initialState: SetPasswordActionState = {
  fieldErrors: {},
  message: "",
};

export function AdminSetPasswordForm({
  locale,
  mode,
  redirectTo,
}: AdminSetPasswordFormProps) {
  const t = useTranslations("Admin");
  const requiredLabel = getRequiredFieldBadge(locale);
  const [state, formAction, isPending] = useActionState(
    setPasswordAction.bind(null, locale),
    initialState
  );

  useEffect(() => {
    if (!state.fieldErrors || Object.keys(state.fieldErrors).length === 0) {
      return;
    }

    focusFirstInvalidField(state.fieldErrors);
  }, [state.fieldErrors]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />
      <AdminInput
        id="password"
        name="password"
        type="password"
        label={t("accountSetup.password")}
        autoComplete="new-password"
        placeholder={t("accountSetup.password")}
        required
        requiredLabel={requiredLabel}
        errorText={state.fieldErrors?.password}
      />
      <AdminInput
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label={t("accountSetup.confirmPassword")}
        autoComplete="new-password"
        placeholder={t("accountSetup.confirmPassword")}
        required
        requiredLabel={requiredLabel}
        errorText={state.fieldErrors?.confirmPassword}
      />
      {state.message ? (
        <div className="rounded-[1.4rem] border border-rose-400/24 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
          {state.message}
        </div>
      ) : null}
      <AdminButton type="submit" variant="primary" block disabled={isPending}>
        {mode === "password_reset"
          ? t("accountSetup.resetSubmit")
          : t("accountSetup.submit")}
      </AdminButton>
    </form>
  );
}
