"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle, LockKeyhole, Mail } from "lucide-react";
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
  redirectTo?: string;
};

const initialState: LoginActionState = {
  fieldErrors: {},
  message: "",
};

export function AdminLoginForm({ locale, redirectTo }: AdminLoginFormProps) {
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
    <form action={formAction} className="admin-login-form">
      <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />
      <AdminInput
        id="email"
        name="email"
        type="email"
        label={t("login.email")}
        autoComplete="email"
        placeholder="name@company.com"
        required
        requiredLabel={requiredLabel}
        errorText={state.fieldErrors?.email}
        icon={<Mail className="h-4 w-4" />}
        wrapperClassName="admin-login-field"
        className="text-base"
        autoFocus
      />
      <AdminInput
        id="password"
        name="password"
        type="password"
        label={t("login.password")}
        autoComplete="current-password"
        placeholder="********"
        required
        requiredLabel={requiredLabel}
        errorText={state.fieldErrors?.password}
        icon={<LockKeyhole className="h-4 w-4" />}
        wrapperClassName="admin-login-field"
        className="text-base"
      />
      {state.message ? (
        <div
          aria-live="polite"
          className="admin-login-notice border border-rose-400/24 bg-rose-400/10 text-rose-100"
        >
          {state.message}
        </div>
      ) : null}
      <AdminButton
        type="submit"
        variant="primary"
        block
        disabled={isPending}
        className="admin-login-submit"
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {t("login.formTitle")}
      </AdminButton>
    </form>
  );
}
