"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { employees, workshops } from "@/data/adminMock";
import {
  getCurrentAdminUser,
  hasAdminRoleAccess,
  scopeEmployeesForUser,
} from "@/lib/admin/currentUser";
import type { Employee } from "@/types/admin";

export default function AdminEmployeesPage() {
  const t = useTranslations("Admin");
  const currentUser = getCurrentAdminUser();
  const canAccess = hasAdminRoleAccess(currentUser, ["super_admin", "admin"]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [workshopFilter, setWorkshopFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!canAccess) {
    return (
      <AdminCard title={t("common.noAccessTitle")} description={t("common.noAccessText")} />
    );
  }

  const visibleEmployees = scopeEmployeesForUser(currentUser, employees).filter((employee) => {
    const matchesSearch =
      search.length === 0 ||
      employee.name.toLowerCase().includes(search.toLowerCase()) ||
      employee.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || employee.role === roleFilter;
    const matchesWorkshop =
      workshopFilter === "all" || employee.workshopId === workshopFilter;

    return matchesSearch && matchesRole && matchesWorkshop;
  });

  const columns: AdminTableColumn<Employee>[] = [
    {
      id: "employee",
      header: t("employees.table.employee"),
      cell: (employee) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{employee.name}</p>
          <p className="text-xs text-muted">{employee.email}</p>
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
      cell: (employee) =>
        workshops.find((workshop) => workshop.id === employee.workshopId)?.name ?? "-",
    },
    {
      id: "activeTasks",
      header: t("employees.table.activeTasks"),
      cell: (employee) => employee.assignedOrderIds.length,
    },
    {
      id: "attendance",
      header: t("employees.table.attendance"),
      cell: (employee) => <AdminBadge variant="info">{t(`status.${employee.status}`)}</AdminBadge>,
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
      cell: () => (
        <div className="flex flex-wrap justify-end gap-2">
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() => setFeedback(t("common.mockSubmit"))}
          >
            {t("buttons.edit")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant="ghost"
            onClick={() => setFeedback(t("common.mockSubmit"))}
          >
            {t("buttons.viewDetails")}
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
          <AdminButton variant="primary" onClick={() => setFeedback(t("common.mockSubmit"))}>
            {t("buttons.addEmployee")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
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
            <option value="admin">{t("roles.admin")}</option>
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
          rows={visibleEmployees}
          getRowKey={(employee) => employee.id}
          cardTitle={(employee) => employee.name}
          emptyState={t("employees.empty")}
        />
      </AdminCard>
    </div>
  );
}
