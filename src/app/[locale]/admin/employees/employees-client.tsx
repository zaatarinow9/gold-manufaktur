"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  linkEmployeeAccountAction,
  saveEmployeeAction,
  sendEmployeeInviteAction,
  sendEmployeePasswordResetAction,
  toggleEmployeeActiveAction,
} from "@/app/[locale]/admin/employees/actions";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import type { AdminActionResult } from "@/lib/admin/actionResult";
import type { EmployeeAccountRecord } from "@/lib/db/employeeAccounts";
import type { WorkshopRecord } from "@/lib/db/workshops";

type EmployeeFormState = {
  attendanceStatus: "absent" | "late" | "present" | "sick" | "vacation";
  email: string;
  fullName: string;
  id?: string;
  isActive: boolean;
  notes: string;
  phone: string;
  shiftLabel: string;
  workshopId: string;
};

type FeedbackState =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

type AdminEmployeesClientProps = {
  defaultWorkshopId?: string;
  employees: EmployeeAccountRecord[];
  locale: AppLocale;
  workshops: WorkshopRecord[];
};

function createEmptyForm(defaultWorkshopId?: string): EmployeeFormState {
  return {
    attendanceStatus: "present",
    email: "",
    fullName: "",
    isActive: true,
    notes: "",
    phone: "",
    shiftLabel: "",
    workshopId: defaultWorkshopId ?? "",
  };
}

function createEditForm(employee: EmployeeAccountRecord): EmployeeFormState {
  return {
    attendanceStatus: employee.attendanceStatus,
    email: employee.email,
    fullName: employee.fullName,
    id: employee.id,
    isActive: employee.isActive,
    notes: employee.notes,
    phone: employee.phone,
    shiftLabel: employee.shiftLabel,
    workshopId: employee.workshopId,
  };
}

function formatDateTime(locale: AppLocale, value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAccountStatusVariant(status: EmployeeAccountRecord["accountStatus"]) {
  switch (status) {
    case "active":
      return "success";
    case "disabled":
      return "danger";
    case "invited":
      return "info";
    default:
      return "neutral";
  }
}

export function AdminEmployeesClient({
  defaultWorkshopId,
  employees,
  locale,
  workshops,
}: AdminEmployeesClientProps) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [workshopFilter, setWorkshopFilter] = useState("all");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [formState, setFormState] = useState<EmployeeFormState>(() =>
    createEmptyForm(defaultWorkshopId)
  );

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        search.length === 0 ||
        employee.fullName.toLowerCase().includes(normalizedSearch) ||
        employee.email.toLowerCase().includes(normalizedSearch);
      const matchesWorkshop =
        workshopFilter === "all" || employee.workshopId === workshopFilter;

      return matchesSearch && matchesWorkshop;
    });
  }, [employees, search, workshopFilter]);

  const pushFeedback = (result: AdminActionResult) => {
    setFeedback({
      kind: result.ok ? "success" : "error",
      message: result.message,
    });
  };

  const handleResult = (
    result: AdminActionResult,
    options?: { closeEditor?: boolean }
  ) => {
    pushFeedback(result);

    if (result.ok || result.shouldRefresh) {
      if (options?.closeEditor) {
        resetForm();
      }
      router.refresh();
    }
  };

  const resetForm = () => {
    setEditorOpen(false);
    setFormState(createEmptyForm(defaultWorkshopId));
  };

  const submitForm = () => {
    startTransition(async () => {
      const payload = {
        attendanceStatus: formState.attendanceStatus,
        email: formState.email,
        fullName: formState.fullName,
        isActive: formState.isActive,
        notes: formState.notes,
        phone: formState.phone,
        role: "employee" as const,
        shiftLabel: formState.shiftLabel,
        workshopId: formState.workshopId,
      };
      const result = formState.id
        ? await saveEmployeeAction(locale, { ...payload, id: formState.id })
        : await saveEmployeeAction(locale, payload);

      handleResult(result, { closeEditor: true });
    });
  };

  const runRowAction = (
    action: () => Promise<AdminActionResult>,
    options?: { closeEditor?: boolean }
  ) => {
    startTransition(async () => {
      const result = await action();
      handleResult(result, options);
    });
  };

  const columns: AdminTableColumn<EmployeeAccountRecord>[] = [
    {
      id: "employee",
      header: t("employees.table.employee"),
      cell: (employee) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{employee.fullName}</p>
          <p className="text-xs text-muted">
            {employee.linkedAccountEmail || employee.email || "-"}
          </p>
        </div>
      ),
    },
    {
      id: "workshop",
      header: t("employees.table.workshop"),
      cell: (employee) => employee.workshopName || "-",
    },
    {
      id: "activeTasks",
      header: t("employees.table.activeTasks"),
      cell: (employee) => employee.assignedOrderCount,
    },
    {
      id: "attendance",
      header: t("employees.table.attendance"),
      cell: (employee) => (
        <AdminBadge variant="info">{t(`status.${employee.attendanceStatus}`)}</AdminBadge>
      ),
    },
    {
      id: "accountStatus",
      header: t("employees.table.accountStatus"),
      cell: (employee) => {
        const inviteDate = formatDateTime(locale, employee.lastInviteSentAt);
        const resetDate = formatDateTime(locale, employee.lastPasswordResetSentAt);
        const loginDate = formatDateTime(locale, employee.lastLoginAt);

        return (
          <div className="space-y-1">
            <AdminBadge variant={getAccountStatusVariant(employee.accountStatus)}>
              {t(`employees.account.status.${employee.accountStatus}`)}
            </AdminBadge>
            {!employee.email ? (
              <p className="text-xs text-muted">{t("employees.account.noEmail")}</p>
            ) : null}
            {loginDate ? (
              <p className="text-xs text-muted">
                {t("employees.account.lastLogin")}: {loginDate}
              </p>
            ) : inviteDate ? (
              <p className="text-xs text-muted">
                {t("employees.account.lastInvite")}: {inviteDate}
              </p>
            ) : resetDate ? (
              <p className="text-xs text-muted">
                {t("employees.account.lastPasswordReset")}: {resetDate}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "status",
      header: t("employees.table.status"),
      cell: (employee) => (
        <AdminBadge variant={employee.isActive ? "success" : "danger"}>
          {employee.isActive ? t("common.active") : t("common.inactive")}
        </AdminBadge>
      ),
    },
    {
      id: "actions",
      header: t("employees.table.actions"),
      align: "end",
      cell: (employee) => {
        const hasEmail = employee.email.trim().length > 0;
        const canResetPassword = employee.isActive && (Boolean(employee.authUserId) || employee.canLinkAccount);
        const inviteLabel =
          employee.accountStatus === "invited" || employee.accountStatus === "active"
            ? t("employees.account.actions.resendInvite")
            : t("employees.account.actions.sendInvite");

        return (
          <div className="flex flex-wrap justify-end gap-2">
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => {
                setFeedback(null);
                setFormState(createEditForm(employee));
                setEditorOpen(true);
              }}
            >
              {t("buttons.edit")}
            </AdminButton>
            {employee.isActive && hasEmail ? (
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={() =>
                  runRowAction(() => sendEmployeeInviteAction(locale, employee.id))
                }
              >
                {inviteLabel}
              </AdminButton>
            ) : null}
            {employee.isActive && employee.canLinkAccount ? (
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={() =>
                  runRowAction(() => linkEmployeeAccountAction(locale, employee.id))
                }
              >
                {t("employees.account.actions.linkAccount")}
              </AdminButton>
            ) : null}
            {canResetPassword ? (
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={() =>
                  runRowAction(() =>
                    sendEmployeePasswordResetAction(locale, employee.id)
                  )
                }
              >
                {t("employees.account.actions.resetPassword")}
              </AdminButton>
            ) : null}
            <AdminButton
              size="sm"
              variant={employee.isActive ? "ghost" : "danger"}
              onClick={() =>
                runRowAction(() =>
                  toggleEmployeeActiveAction(locale, employee.id, !employee.isActive)
                )
              }
            >
              {employee.isActive ? t("buttons.deactivate") : t("buttons.activate")}
            </AdminButton>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("employees.eyebrow")}
        title={t("employees.title")}
        description={t("employees.description")}
        actions={
          <AdminButton
            variant="primary"
            onClick={() => {
              setFeedback(null);
              setFormState(createEmptyForm(defaultWorkshopId));
              setEditorOpen(true);
            }}
          >
            {t("employees.account.create")}
          </AdminButton>
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

      {editorOpen ? (
        <AdminCard
          title={formState.id ? t("employees.account.edit") : t("employees.account.create")}
          description={t("employees.account.formDescription")}
          action={
            <div className="flex gap-2">
              <AdminButton variant="ghost" onClick={resetForm}>
                {t("buttons.close")}
              </AdminButton>
              <AdminButton variant="primary" onClick={submitForm} disabled={isPending}>
                {t("buttons.save")}
              </AdminButton>
            </div>
          }
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminInput
              label={t("employees.form.fullName")}
              value={formState.fullName}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
            />
            <AdminSelect
              label={t("employees.table.workshop")}
              value={formState.workshopId}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  workshopId: event.target.value,
                }))
              }
            >
              {workshops.map((workshop) => (
                <option key={workshop.id} value={workshop.id}>
                  {workshop.name}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              label={t("employees.form.attendance")}
              value={formState.attendanceStatus}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  attendanceStatus: event.target.value as EmployeeFormState["attendanceStatus"],
                }))
              }
            >
              {(["present", "absent", "vacation", "sick", "late"] as const).map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </AdminSelect>
            <AdminInput
              label={t("employees.form.phone")}
              value={formState.phone}
              onChange={(event) =>
                setFormState((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <AdminInput
              label={t("employees.form.email")}
              value={formState.email}
              helperText={t("employees.form.emailHint")}
              onChange={(event) =>
                setFormState((current) => ({ ...current, email: event.target.value }))
              }
            />
            <AdminInput
              label={t("employees.form.shift")}
              value={formState.shiftLabel}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  shiftLabel: event.target.value,
                }))
              }
            />
            <div className="xl:col-span-2">
              <AdminTextarea
                label={t("employees.form.notes")}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>
            <div className="xl:col-span-2">
              <label className="rtl-inline-row flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#c49a52]"
                />
                {t("employees.form.active")}
              </label>
            </div>
          </div>
        </AdminCard>
      ) : null}

      <AdminCard
        title={t("employees.filtersTitle")}
        description={t("employees.filtersDescription")}
      >
        <AdminToolbar>
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t("common.search")}
            placeholder={t("employees.searchPlaceholder")}
            icon={<Search className="h-4 w-4" />}
          />
          <AdminSelect
            value={workshopFilter}
            onChange={(event) => setWorkshopFilter(event.target.value)}
            label={t("filters.workshop")}
          >
            <option value="all">{t("common.all")}</option>
            {workshops.map((workshop) => (
              <option key={workshop.id} value={workshop.id}>
                {workshop.name}
              </option>
            ))}
          </AdminSelect>
        </AdminToolbar>
      </AdminCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filteredEmployees}
          getRowKey={(employee) => employee.id}
          cardTitle={(employee) => employee.fullName}
          emptyState={t("employees.empty")}
        />
      </AdminCard>
    </div>
  );
}
