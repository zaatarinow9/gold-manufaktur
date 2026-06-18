"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { attendanceRecords, employees, workshops } from "@/data/adminMock";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentAdminUser, scopeAttendanceForUser } from "@/lib/admin/currentUser";
import type { AttendanceRecord } from "@/types/admin";

function getAttendancePreviewMessage(locale: AppLocale) {
  if (locale === "de") {
    return "Neue Abwesenheiten werden in dieser Ansicht noch nicht live gespeichert.";
  }

  if (locale === "ar") {
    return "إضافة الغياب من هذه الصفحة ما زالت قيد التجهيز ولم تُربط بالحفظ المباشر بعد.";
  }

  return "Adding new attendance records from this screen is not connected yet.";
}

export default function AdminAttendancePage() {
  const t = useTranslations("Admin");
  const locale = useLocale() as AppLocale;
  const currentUser = getCurrentAdminUser();
  const [statusFilter, setStatusFilter] = useState("all");
  const [workshopFilter, setWorkshopFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const visibleRecords = scopeAttendanceForUser(currentUser, attendanceRecords).filter((record) => {
    const employee = employees.find((item) => item.id === record.employeeId);
    const matchesStatus = statusFilter === "all" ? true : record.status === statusFilter;
    const matchesWorkshop =
      workshopFilter === "all" ? true : employee?.workshopId === workshopFilter;

    return matchesStatus && matchesWorkshop;
  });

  const columns: AdminTableColumn<AttendanceRecord>[] = [
    {
      id: "employee",
      header: t("attendance.table.employee"),
      cell: (record) =>
        employees.find((employee) => employee.id === record.employeeId)?.name ?? "-",
    },
    {
      id: "workshop",
      header: t("attendance.table.workshop"),
      cell: (record) => {
        const employee = employees.find((item) => item.id === record.employeeId);
        return workshops.find((workshop) => workshop.id === employee?.workshopId)?.name ?? "-";
      },
    },
    { id: "date", header: t("attendance.table.date"), cell: (record) => record.date },
    { id: "shift", header: t("attendance.table.shift"), cell: (record) => record.shift },
    {
      id: "status",
      header: t("attendance.table.status"),
      cell: (record) => (
        <AdminBadge
          variant={
            record.status === "present"
              ? "success"
              : record.status === "late"
                ? "warning"
                : "danger"
          }
        >
          {t(`status.${record.status}`)}
        </AdminBadge>
      ),
    },
    {
      id: "note",
      header: t("attendance.table.note"),
      cell: (record) => record.note ?? "-",
    },
  ];

  const statuses = ["present", "absent", "vacation", "sick", "late"] as const;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("attendance.eyebrow")}
        title={t("attendance.title")}
        description={t("attendance.description")}
        actions={
          <AdminButton
            variant="primary"
            onClick={() => setFeedback(getAttendancePreviewMessage(locale))}
          >
            {t("buttons.addAbsence")}
          </AdminButton>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statuses.map((status) => (
          <AdminStatCard
            key={status}
            label={t(`status.${status}`)}
            value={visibleRecords.filter((record) => record.status === status).length}
          />
        ))}
      </section>

      <AdminCard title={t("attendance.filtersTitle")} description={t("attendance.filtersDescription")}>
        <AdminToolbar>
          <AdminSelect
            className="max-w-xs"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            label={t("filters.status")}
          >
            <option value="all">{t("common.all")}</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {t(`status.${status}`)}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            className="max-w-xs"
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
          rows={visibleRecords}
          getRowKey={(record) => record.id}
          cardTitle={(record) =>
            employees.find((employee) => employee.id === record.employeeId)?.name ?? "-"
          }
          emptyState={t("attendance.empty")}
        />
      </AdminCard>
    </div>
  );
}
