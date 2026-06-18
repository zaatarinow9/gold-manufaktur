"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { OrderTrackingCard } from "@/components/admin/OrderTrackingCard";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { EmployeeRecord } from "@/lib/db/employees";
import type { OrderListRecord } from "@/lib/db/orders";
import type { WorkshopRecord } from "@/lib/db/workshops";
import type { AdminRole } from "@/types/admin";
import { workshopOrderStatusValues } from "@/types/admin";

type AdminOrdersClientProps = {
  canCreate: boolean;
  currentUserRole: AdminRole;
  employees: EmployeeRecord[];
  locale: AppLocale;
  orders: OrderListRecord[];
  workshops: WorkshopRecord[];
};

export function AdminOrdersClient({
  canCreate,
  currentUserRole,
  employees,
  locale,
  orders,
  workshops,
}: AdminOrdersClientProps) {
  const t = useTranslations("Admin");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [workshopFilter, setWorkshopFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        search.length === 0 ||
        order.internalOrderNumber.toLowerCase().includes(normalizedSearch) ||
        order.trackingNumber.toLowerCase().includes(normalizedSearch) ||
        order.previewProductName.toLowerCase().includes(normalizedSearch) ||
        order.workshopName.toLowerCase().includes(normalizedSearch) ||
        order.employeeName.toLowerCase().includes(normalizedSearch) ||
        order.customerName.toLowerCase().includes(normalizedSearch) ||
        order.customerEmail.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || order.priority === priorityFilter;
      const matchesWorkshop =
        workshopFilter === "all" || order.workshopId === workshopFilter;
      const matchesEmployee =
        employeeFilter === "all" || order.employeeId === employeeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesWorkshop &&
        matchesEmployee
      );
    });
  }, [employeeFilter, orders, priorityFilter, search, statusFilter, workshopFilter]);

  const workshopChoices = workshops.map((workshop) => [workshop.id, workshop.name] as const);
  const employeeChoices = employees.map((employee) => [employee.id, employee.fullName] as const);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  const columns: AdminTableColumn<OrderListRecord>[] = [
    {
      id: "order",
      header: t("orders.table.order"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{order.internalOrderNumber}</p>
          <p className="text-xs text-muted">{order.previewProductName || "-"}</p>
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
      cell: (order) => order.customerName || t("common.noCustomer"),
    },
    {
      id: "workshop",
      header: t("orders.table.workshop"),
      cell: (order) => order.workshopName || "-",
    },
    {
      id: "status",
      header: t("orders.table.status"),
      cell: (order) => (
        <div className="flex flex-wrap gap-2">
          <AdminBadge variant="gold">
            {order.publicTrackingStage
              ? t(`publicTrackingStage.${order.publicTrackingStage}`)
              : t("orders.noPublicStage")}
          </AdminBadge>
          <AdminBadge variant="info">{t(`status.${order.status}`)}</AdminBadge>
          <AdminBadge variant="neutral">
            {t(`trackingStatus.${order.trackingStatus}`)}
          </AdminBadge>
        </div>
      ),
    },
    {
      id: "assignment",
      header: t("orders.table.employee"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="text-foreground">{order.employeeName || t("common.unassigned")}</p>
          <p className="text-xs text-muted">
            {t(`priority.${order.priority}`)} {" | "}
            {order.supportTicketCount} ticket(s)
          </p>
        </div>
      ),
    },
    {
      id: "dueDate",
      header: t("orders.table.dueDate"),
      cell: (order) => order.dueDate || "-",
    },
    {
      id: "action",
      align: "end",
      header: t("orders.table.action"),
      cell: (order) => (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={getAdminButtonClassName({ size: "sm", variant: "ghost" })}
            onClick={() => setSelectedOrderId(order.id)}
          >
            {t("buttons.updateStatus")}
          </button>
          <Link
            href={`/admin/orders/${order.id}`}
            className={getAdminButtonClassName({ size: "sm", variant: "secondary" })}
          >
            {t("buttons.viewDetails")}
          </Link>
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
          canCreate ? (
            <Link
              href="/admin/gallery/new-order"
              className={getAdminButtonClassName({ variant: "primary" })}
            >
              {t("buttons.createOrder")}
            </Link>
          ) : undefined
        }
      />

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
            {workshopChoices.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            value={employeeFilter}
            onChange={(event) => setEmployeeFilter(event.target.value)}
            label={t("filters.employee")}
          >
            <option value="all">{t("common.all")}</option>
            {employeeChoices.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </AdminSelect>
        </AdminToolbar>
      </AdminCard>

      {selectedOrder ? (
        <OrderTrackingCard
          key={selectedOrder.id}
          currentUserRole={currentUserRole}
          customerEmail={selectedOrder.customerEmail}
          emailUpdatesEnabled={selectedOrder.emailUpdatesEnabled}
          employees={employees}
          initialEmployeeId={selectedOrder.employeeId}
          initialPublicStage={selectedOrder.publicTrackingStage}
          initialStatus={selectedOrder.trackingStatus}
          initialWorkshopId={selectedOrder.workshopId}
          locale={locale}
          orderId={selectedOrder.id}
          showTimeline={false}
          trackingNumber={selectedOrder.trackingNumber}
          workshops={workshops}
        />
      ) : null}

      <AdminCard>
        <AdminTable
          columns={columns}
          rows={filteredOrders}
          getRowKey={(order) => order.id}
          cardTitle={(order) => order.internalOrderNumber}
          emptyState={t("orders.empty")}
        />
      </AdminCard>
    </div>
  );
}
