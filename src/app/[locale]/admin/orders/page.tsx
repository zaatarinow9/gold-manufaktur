"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminButton, getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { adminOrders, employees, workshops } from "@/data/adminMock";
import { Link } from "@/i18n/navigation";
import {
  getAssignedEmployeeName,
  getCurrentAdminUser,
  scopeOrdersForUser,
} from "@/lib/admin/currentUser";
import { workshopOrderStatusValues, type WorkshopOrder } from "@/types/admin";

export default function AdminOrdersPage() {
  const t = useTranslations("Admin");
  const currentUser = getCurrentAdminUser();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [workshopFilter, setWorkshopFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const orders = scopeOrdersForUser(currentUser, adminOrders).filter((order) => {
    const query = search.toLowerCase();
    const matchesSearch =
      search.length === 0 ||
      order.internalOrderNumber.toLowerCase().includes(query) ||
      order.trackingNumber.toLowerCase().includes(query) ||
      order.items[0]?.productName.toLowerCase().includes(query) ||
      order.workshopName.toLowerCase().includes(query) ||
      (order.customerName ?? "").toLowerCase().includes(query) ||
      (order.customerEmail ?? "").toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    const matchesWorkshop =
      workshopFilter === "all" || order.workshopId === workshopFilter;
    const matchesEmployee =
      employeeFilter === "all" || order.assignedEmployeeId === employeeFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesWorkshop &&
      matchesEmployee
    );
  });

  const columns: AdminTableColumn<WorkshopOrder>[] = [
    {
      id: "order",
      header: t("orders.table.order"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{order.internalOrderNumber}</p>
          <p className="text-xs text-muted">{order.items[0]?.productName}</p>
        </div>
      ),
    },
    {
      id: "trackingNumber",
      header: t("orders.table.trackingNumber"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{order.trackingNumber}</p>
          <p className="text-xs text-muted">{t(`trackingStatus.${order.trackingStatus}`)}</p>
        </div>
      ),
    },
    {
      id: "customer",
      header: t("orders.table.customer"),
      cell: (order) => order.customerName ?? t("common.noCustomer"),
    },
    {
      id: "email",
      header: t("orders.table.email"),
      cell: (order) => order.customerEmail ?? "-",
    },
    {
      id: "workshop",
      header: t("orders.table.workshop"),
      cell: (order) => order.workshopName,
    },
    {
      id: "status",
      header: t("orders.table.status"),
      cell: (order) => (
        <AdminBadge variant="info">{t(`status.${order.status}`)}</AdminBadge>
      ),
    },
    {
      id: "trackingStatus",
      header: t("orders.table.trackingStatus"),
      cell: (order) => (
        <AdminBadge variant="gold">{t(`trackingStatus.${order.trackingStatus}`)}</AdminBadge>
      ),
    },
    {
      id: "dueDate",
      header: t("orders.table.dueDate"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="text-foreground">{order.dueDate}</p>
          <p className="text-xs text-muted">
            {getAssignedEmployeeName(order.assignedEmployeeId, employees) ??
              t("common.unassigned")}
          </p>
        </div>
      ),
    },
    {
      id: "action",
      header: t("orders.table.action"),
      align: "end",
      cell: (order) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href={`/admin/orders/${order.id}`}
            className={getAdminButtonClassName({ size: "sm", variant: "secondary" })}
          >
            {t("buttons.viewDetails")}
          </Link>
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() => setFeedback(t("common.mockSubmit"))}
          >
            {t("buttons.updateStatus")}
          </AdminButton>
          <AdminButton
            size="sm"
            variant="ghost"
            onClick={() => setFeedback(t("common.mockSubmit"))}
          >
            {t("buttons.assignEmployee")}
          </AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("orders.eyebrow")}
        title={t("orders.title")}
        description={t("orders.description")}
        actions={
          <Link
            href="/admin/gallery/new-order"
            className={getAdminButtonClassName({ variant: "primary" })}
          >
            {t("buttons.createOrder")}
          </Link>
        }
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <AdminCard title={t("orders.filtersTitle")} description={t("orders.filtersDescription")}>
        <AdminToolbar>
          <AdminInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t("common.search")}
            placeholder={t("orders.searchPlaceholder")}
            icon={<Search className="h-4 w-4" />}
          />
          <AdminSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            label={t("filters.status")}
          >
            <option value="all">{t("common.all")}</option>
            {workshopOrderStatusValues.map((status) => (
              <option key={status} value={status}>
                {t(`status.${status}`)}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            label={t("filters.priority")}
          >
            <option value="all">{t("common.all")}</option>
            {["normal", "urgent", "express"].map((priority) => (
              <option key={priority} value={priority}>
                {t(`priority.${priority}`)}
              </option>
            ))}
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
          <AdminSelect
            value={employeeFilter}
            onChange={(event) => setEmployeeFilter(event.target.value)}
            label={t("filters.employee")}
          >
            <option value="all">{t("common.all")}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </AdminSelect>
        </AdminToolbar>
      </AdminCard>

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={orders}
          getRowKey={(order) => order.id}
          cardTitle={(order) => order.internalOrderNumber}
          emptyState={t("orders.empty")}
        />
      </AdminCard>
    </div>
  );
}
