"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  loginAction,
  type LoginActionState,
} from "@/app/[locale]/admin/login/actions";
import {
  focusFirstInvalidField,
  getRequiredFieldBadge,
} from "@/lib/admin/clientForm";

import { AdminButton } from "./AdminButton";
import { AdminInput } from "./AdminInput";

type AdminLoginFormProps = {
  locale: AppLocale;
};

const initialState: LoginActionState = {
  fieldErrors: {},
  message: "",
};

export function AdminLoginForm({ locale }: AdminLoginFormProps) {
  const t = useTranslations("Admin");
  const requiredLabel = getRequiredFieldBadge(locale);
  const [state, formAction, isPending] = useActionState(
    loginAction.bind(null, locale),
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
      <AdminInput
        id="email"
        name="email"
        type="email"
        label={t("login.email")}
        autoComplete="email"
        placeholder={t("login.email")}
        required
        requiredLabel={requiredLabel}
        errorText={state.fieldErrors?.email}
      />
      <AdminInput
        id="password"
        name="password"
        type="password"
        label={t("login.password")}
        autoComplete="current-password"
        placeholder={t("login.password")}
        required
        requiredLabel={requiredLabel}
        errorText={state.fieldErrors?.password}
      />
      {state.message ? (
        <div className="rounded-[1.4rem] border border-rose-400/24 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
          {state.message}
        </div>
      ) : null}
      <AdminButton type="submit" variant="primary" block disabled={isPending}>
        {t("buttons.next")}
      </AdminButton>
    </form>
  );
}
