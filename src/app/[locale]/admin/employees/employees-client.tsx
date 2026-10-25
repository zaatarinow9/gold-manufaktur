"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Link2, Mail, Pencil, Power, Search, Trash2, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  linkEmployeeAccountAction,
  saveEmployeeAction,
  deleteEmployeeAction,
  sendEmployeeInviteAction,
  sendEmployeePasswordResetAction,
  toggleEmployeeActiveAction,
} from "@/app/[locale]/admin/employees/actions";
import { AdminActionMenu, type AdminActionMenuItem } from "@/components/admin/AdminActionMenu";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { useAdminConfirm } from "@/components/admin/AdminConfirm";
import { AdminButton, getAdminButtonClassName } from "@/components/admin/AdminButton";
import { Link } from "@/i18n/navigation";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminDrawer, AdminFormSection } from "@/components/admin/AdminDrawer";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminTextarea } from "@/components/admin/AdminTextarea";
import { AdminSwitch } from "@/components/admin/AdminSwitch";
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
  const confirm = useAdminConfirm();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [workshopFilter, setWorkshopFilter] = useState("all");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // Deleted people vanish from the list immediately.
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [formState, setFormState] = useState<EmployeeFormState>(() =>
    createEmptyForm(defaultWorkshopId)
  );

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return employees.filter((employee) => {
      if (removedIds.has(employee.id)) return false;
      const matchesSearch =
        search.length === 0 ||
        employee.fullName.toLowerCase().includes(normalizedSearch) ||
        employee.email.toLowerCase().includes(normalizedSearch);
      const matchesWorkshop =
        workshopFilter === "all" || employee.workshopId === workshopFilter;

      return matchesSearch && matchesWorkshop;
    });
  }, [employees, removedIds, search, workshopFilter]);

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

  const openEditor = (state: EmployeeFormState) => {
    setFeedback(null);
    setFormState(state);
    setEditorOpen(true);
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
        const loginDate = formatDateTime(locale, employee.lastLoginAt);

        return (
          <div className="space-y-1">
            {employee.isActive ? (
              <AdminBadge variant={getAccountStatusVariant(employee.accountStatus)}>
                {t(`employees.account.status.${employee.accountStatus}`)}
              </AdminBadge>
            ) : (
              <AdminBadge variant="danger">{t("common.inactive")}</AdminBadge>
            )}
            {!employee.email ? (
              <p className="text-xs text-muted">{t("employees.account.noEmail")}</p>
            ) : loginDate ? (
              <p className="text-xs text-muted">
                {t("employees.account.lastLogin")}: {loginDate}
              </p>
            ) : inviteDate ? (
              <p className="text-xs text-muted">
                {t("employees.account.lastInvite")}: {inviteDate}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("employees.table.actions")}</span>,
      align: "end",
      cell: (employee) => {
        const hasEmail = employee.email.trim().length > 0;
        const canResetPassword = employee.isActive && (Boolean(employee.authUserId) || employee.canLinkAccount);
        const inviteLabel =
          employee.accountStatus === "invited" || employee.accountStatus === "active"
            ? t("employees.account.actions.resendInvite")
            : t("employees.account.actions.sendInvite");
        const menuItems: AdminActionMenuItem[] = [
          ...(employee.isActive && hasEmail
            ? [{ icon: Mail, label: inviteLabel, onSelect: () => runRowAction(() => sendEmployeeInviteAction(locale, employee.id)) }]
            : []),
          ...(employee.isActive && employee.canLinkAccount
            ? [{ icon: Link2, label: t("employees.account.actions.linkAccount"), onSelect: () => runRowAction(() => linkEmployeeAccountAction(locale, employee.id)) }]
            : []),
          ...(canResetPassword
            ? [{ icon: KeyRound, label: t("employees.account.actions.resetPassword"), onSelect: () => runRowAction(() => sendEmployeePasswordResetAction(locale, employee.id)) }]
            : []),
          {
            danger: employee.isActive,
            icon: Power,
            label: employee.isActive ? t("buttons.deactivate") : t("buttons.activate"),
            onSelect: () => runRowAction(() => toggleEmployeeActiveAction(locale, employee.id, !employee.isActive)),
          },
          {
            danger: true,
            icon: Trash2,
            label: t("buttons.delete"),
            onSelect: async () => {
              const confirmed = await confirm({
                description: t("employees.deleteConfirmText"),
                title: t("employees.deleteConfirm", { name: employee.fullName }),
              });
              if (!confirmed) return;
              setRemovedIds((current) => new Set(current).add(employee.id));
              startTransition(async () => {
                const result = await deleteEmployeeAction(locale, employee.id);
                if (!result.ok) {
                  setRemovedIds((current) => {
                    const next = new Set(current);
                    next.delete(employee.id);
                    return next;
                  });
                }
                handleResult(result);
              });
            },
          },
        ];

        return (
          <div className="flex items-center justify-end gap-1">
            <AdminButton size="sm" variant="secondary" onClick={() => openEditor(createEditForm(employee))}>
              <Pencil />
              {t("buttons.edit")}
            </AdminButton>
            <AdminActionMenu label={t("productsPage.moreActions", { name: employee.fullName })} items={menuItems} />
          </div>
        );
      },
    },
  ];

  const setField = <Key extends keyof EmployeeFormState>(key: Key, value: EmployeeFormState[Key]) =>
    setFormState((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("employees.title")}
        description={t("employees.description")}
        actions={
          <Link href="/admin/workshops" className={getAdminButtonClassName({ variant: "secondary" })}>
            <Wrench />
            {t("nav.workshops")}
          </Link>
        }
      />

      <p className="admin-notice">
        {t("flow.workshops.peopleHint")}
      </p>

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.kind} role="status">
          {feedback.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative block sm:max-w-sm sm:flex-1">
          <span className="sr-only">{t("common.search")}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="admin-input admin-input-with-icon"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("employees.searchPlaceholder")}
          />
        </label>
        {workshops.length > 1 ? (
          <label className="block sm:w-64">
            <span className="sr-only">{t("filters.workshop")}</span>
            <select className="admin-select" value={workshopFilter} onChange={(event) => setWorkshopFilter(event.target.value)}>
              <option value="all">
                {t("filters.workshop")}: {t("common.all")}
              </option>
              {workshops.map((workshop) => (
                <option key={workshop.id} value={workshop.id}>
                  {workshop.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filteredEmployees}
          getRowKey={(employee) => employee.id}
          cardTitle={(employee) => employee.fullName}
          emptyState={t("employees.empty")}
        />
      </AdminCard>

      <AdminDrawer
        open={editorOpen}
        onClose={resetForm}
        title={formState.id ? t("employees.account.edit") : t("employees.account.create")}
        description={t("employees.account.formDescription")}
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" onClick={resetForm}>
              {t("buttons.cancel")}
            </AdminButton>
            <AdminButton variant="primary" onClick={submitForm} disabled={isPending || !formState.fullName.trim()}>
              {t("buttons.save")}
            </AdminButton>
          </div>
        }
      >
        <AdminFormSection title={t("employees.table.employee")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminInput
              wrapperClassName="sm:col-span-2"
              label={t("employees.form.fullName")}
              required
              requiredLabel={t("translations.required")}
              value={formState.fullName}
              onChange={(event) => setField("fullName", event.target.value)}
            />
            <AdminInput
              label={t("employees.form.email")}
              type="email"
              dir="ltr"
              value={formState.email}
              helperText={t("employees.form.emailHint")}
              onChange={(event) => setField("email", event.target.value)}
            />
            <AdminInput
              label={t("employees.form.phone")}
              type="tel"
              dir="ltr"
              value={formState.phone}
              onChange={(event) => setField("phone", event.target.value)}
            />
          </div>
        </AdminFormSection>

        <AdminFormSection title={t("employees.table.workshop")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminSelect
              label={t("employees.table.workshop")}
              value={formState.workshopId}
              onChange={(event) => setField("workshopId", event.target.value)}
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
              onChange={(event) => setField("attendanceStatus", event.target.value as EmployeeFormState["attendanceStatus"])}
            >
              {(["present", "absent", "vacation", "sick", "late"] as const).map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </AdminSelect>
            <AdminInput
              label={t("employees.form.shift")}
              value={formState.shiftLabel}
              onChange={(event) => setField("shiftLabel", event.target.value)}
            />
            <AdminTextarea
              wrapperClassName="sm:col-span-2"
              label={t("employees.form.notes")}
              value={formState.notes}
              onChange={(event) => setField("notes", event.target.value)}
            />
          </div>
          <div className="mt-4">
            <AdminSwitch
              checked={formState.isActive}
              onChange={(checked) => setField("isActive", checked)}
              label={t("employees.form.active")}
            />
          </div>
        </AdminFormSection>
      </AdminDrawer>
    </div>
  );
}
