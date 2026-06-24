"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import {
  saveEmployeeAction,
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
import type { EmployeeRecord } from "@/lib/db/employees";
import type { WorkshopRecord } from "@/lib/db/workshops";

type EmployeeFormState = {
  attendanceStatus: "absent" | "late" | "present" | "sick" | "vacation";
  email: string;
  fullName: string;
  id?: string;
  isActive: boolean;
  notes: string;
  phone: string;
  profileId: string;
  role: "admin" | "employee";
  shiftLabel: string;
  workshopId: string;
};

type AdminEmployeesClientProps = {
  defaultWorkshopId?: string;
  employees: EmployeeRecord[];
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
    profileId: "",
    role: "employee",
    shiftLabel: "",
    workshopId: defaultWorkshopId ?? "",
  };
}

function createEditForm(employee: EmployeeRecord): EmployeeFormState {
  return {
    attendanceStatus: employee.attendanceStatus,
    email: employee.email,
    fullName: employee.fullName,
    id: employee.id,
    isActive: employee.isActive,
    notes: employee.notes,
    phone: employee.phone,
    profileId: employee.profileId ?? "",
    role: employee.role,
    shiftLabel: employee.shiftLabel,
    workshopId: employee.workshopId,
  };
}

export function AdminEmployeesClient({
  defaultWorkshopId,
  employees,
  locale,
  workshops,
}: AdminEmployeesClientProps) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const staffEmployees = useMemo(
    () => employees.filter((employee) => employee.role === "employee"),
    [employees]
  );
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [workshopFilter, setWorkshopFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [formState, setFormState] = useState<EmployeeFormState>(() =>
    createEmptyForm(defaultWorkshopId)
  );

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return staffEmployees.filter((employee) => {
      const matchesSearch =
        search.length === 0 ||
        employee.fullName.toLowerCase().includes(normalizedSearch) ||
        employee.email.toLowerCase().includes(normalizedSearch);
      const matchesRole =
        roleFilter === "all" || employee.role === roleFilter;
      const matchesWorkshop =
        workshopFilter === "all" || employee.workshopId === workshopFilter;

      return matchesSearch && matchesRole && matchesWorkshop;
    });
  }, [roleFilter, search, staffEmployees, workshopFilter]);

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
        profileId: formState.profileId,
        role: "employee" as const,
        shiftLabel: formState.shiftLabel,
        workshopId: formState.workshopId,
      };
      const result = formState.id
        ? await saveEmployeeAction(locale, { ...payload, id: formState.id })
        : await saveEmployeeAction(locale, payload);

      setFeedback(result.message);

      if (result.ok) {
        resetForm();
        router.refresh();
      }
    });
  };

  const columns: AdminTableColumn<EmployeeRecord>[] = [
    {
      id: "employee",
      header: t("employees.table.employee"),
      cell: (employee) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{employee.fullName}</p>
          <p className="text-xs text-muted">{employee.email || "-"}</p>
        </div>
      ),
    },
    {
      id: "role",
      header: t("employees.table.role"),
      cell: (employee) => <AdminBadge variant="info">{t(`roles.${employee.role}`)}</AdminBadge>,
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
      cell: (employee) => <AdminBadge variant="info">{t(`status.${employee.attendanceStatus}`)}</AdminBadge>,
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
      cell: (employee) => (
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
          <AdminButton
            size="sm"
            variant={employee.isActive ? "ghost" : "danger"}
            onClick={() =>
              startTransition(async () => {
                const result = await toggleEmployeeActiveAction(
                  locale,
                  employee.id,
                  !employee.isActive
                );
                setFeedback(result.message);
                if (result.ok) {
                  router.refresh();
                }
              })
            }
          >
            {employee.isActive ? t("buttons.deactivate") : t("buttons.activate")}
          </AdminButton>
        </div>
      ),
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
            {t("buttons.addEmployee")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      {editorOpen ? (
        <AdminCard
          title={formState.id ? t("buttons.edit") : t("buttons.addEmployee")}
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
              label="Name"
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
              label="Attendance"
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
              label="Phone"
              value={formState.phone}
              onChange={(event) =>
                setFormState((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <AdminInput
              label="Email"
              value={formState.email}
              onChange={(event) =>
                setFormState((current) => ({ ...current, email: event.target.value }))
              }
            />
            <AdminInput
              label="Shift"
              value={formState.shiftLabel}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  shiftLabel: event.target.value,
                }))
              }
            />
            <AdminInput
              label="Profile ID"
              value={formState.profileId}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  profileId: event.target.value,
                }))
              }
            />
            <div className="xl:col-span-2">
              <AdminTextarea
                label="Notes"
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
                {t("common.active")}
              </label>
            </div>
          </div>
        </AdminCard>
      ) : null}

      <AdminCard title={t("employees.filtersTitle")} description={t("employees.filtersDescription")}>
        <AdminToolbar>
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t("common.search")}
            placeholder={t("employees.searchPlaceholder")}
            icon={<Search className="h-4 w-4" />}
          />
          <AdminSelect
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            label={t("filters.role")}
          >
            <option value="all">{t("common.all")}</option>
            <option value="employee">{t("roles.employee")}</option>
          </AdminSelect>
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
