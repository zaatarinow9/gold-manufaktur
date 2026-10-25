"use client";

import { useAdminPrivacyUiCopy } from "@/lib/admin/adminCopy";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton, getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminTabs } from "@/components/admin/AdminTabs";
import {
  getAssignmentStatusMessageKey,
} from "@/lib/admin/assignmentStatus";
import {
  useAdminPrivacyMode,
} from "@/components/admin/AdminPrivacyMode";
import { OrderTrackingCard } from "@/components/admin/OrderTrackingCard";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { scrollCardIntoView } from "@/lib/admin/clientForm";
import type { EmployeeRecord } from "@/lib/db/employees";
import type { OrderListRecord } from "@/lib/db/orders";
import type { AdminRole } from "@/types/admin";

type AdminOrdersClientProps = {
  canCreate: boolean;
  currentUserRole: AdminRole;
  employees: EmployeeRecord[];
  locale: AppLocale;
  orders: OrderListRecord[];
};

type OrderTabKey =
  | "all"
  | "pending"
  | "assigned"
  | "in_progress"
  | "shipped"
  | "completed"
  | "cancelled"
  | "archived";

function getOrderWorkerFilterValue(order: OrderListRecord) {
  return order.employeeName.trim() || order.assignedWorkerEmail.trim();
}

function getOrderTabKey(order: OrderListRecord): Exclude<OrderTabKey, "all"> {
  if (order.cancelledAt || order.trackingStatus === "cancelled") {
    return "cancelled";
  }

  if (
    order.completedAt ||
    order.trackingStatus === "completed" ||
    order.trackingStatus === "picked_up" ||
    order.trackingStatus === "delivered_to_store"
  ) {
    return "completed";
  }

  if (order.deletedAt || order.archivedAt || order.status === "archived") {
    return "archived";
  }

  if (
    order.publicTrackingStage === "shipping" ||
    order.trackingStatus === "on_the_way"
  ) {
    return "shipped";
  }

  if (
    order.trackingStatus === "in_production" ||
    order.trackingStatus === "quality_check"
  ) {
    return "in_progress";
  }

  if (order.assignedWorkerEmail || order.employeeId) {
    return "assigned";
  }

  return "pending";
}

function useOrdersUiCopy() {
  const t = useTranslations("Admin.ordersPage");

  return {
    assignedWorker: t("assignedWorker"),
    archived: t("archived"),
    assigned: t("assigned"),
    cancelled: t("cancelled"),
    completed: t("completed"),
    inProgress: t("inProgress"),
    pending: t("pending"),
    noWorker: t("noWorker"),
    privacyHidden: t("privacyHidden"),
    reveal: t("reveal"),
    hideAgain: t("hideAgain"),
    shipped: t("shipped"),
  };
}

export function AdminOrdersClient({
  canCreate,
  currentUserRole,
  employees,
  locale,
  orders,
}: AdminOrdersClientProps) {
  const t = useTranslations("Admin");
  const uiCopy = useOrdersUiCopy();
  const privacyCopy = useAdminPrivacyUiCopy();
  const {
    enabled: privacyModeEnabled,
    masked: privacyMasked,
    setEnabled: setPrivacyModeEnabled,
  } =
    useAdminPrivacyMode();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<OrderTabKey>("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedCardRef = useRef<HTMLDivElement | null>(null);
  const detailsHidden = privacyMasked;

  const workerChoices = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...employees.map((employee) => employee.fullName.trim() || employee.email.trim()),
            ...orders.map((order) => getOrderWorkerFilterValue(order)),
          ].filter((value) => value.length > 0)
        )
      ).sort((left, right) => left.localeCompare(right, locale)),
    [employees, locale, orders]
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const orderTab = getOrderTabKey(order);
      const matchesTab = tab === "all" || orderTab === tab;
      const matchesAssignment =
        assignedFilter === "all" ||
        getOrderWorkerFilterValue(order).toLowerCase() === assignedFilter.toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        order.internalOrderNumber.toLowerCase().includes(normalizedSearch) ||
        order.trackingNumber.toLowerCase().includes(normalizedSearch) ||
        order.previewProductName.toLowerCase().includes(normalizedSearch) ||
        order.customerName.toLowerCase().includes(normalizedSearch) ||
        order.customerEmail.toLowerCase().includes(normalizedSearch) ||
        getOrderWorkerFilterValue(order).toLowerCase().includes(normalizedSearch) ||
        order.employeeName.toLowerCase().includes(normalizedSearch);

      return matchesTab && matchesAssignment && matchesSearch;
    });
  }, [assignedFilter, orders, search, tab]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  useEffect(() => {
    if (!selectedOrder || !selectedCardRef.current) {
      return;
    }

    scrollCardIntoView(selectedCardRef.current);
  }, [selectedOrder]);

  const tabs = useMemo(
    () =>
      [
        { id: "all", label: t("common.all") },
        { id: "pending", label: uiCopy.pending },
        { id: "assigned", label: uiCopy.assigned },
        { id: "in_progress", label: uiCopy.inProgress },
        { id: "shipped", label: uiCopy.shipped },
        { id: "completed", label: uiCopy.completed },
        { id: "cancelled", label: uiCopy.cancelled },
        { id: "archived", label: uiCopy.archived },
      ].map((tabItem) => ({
        ...tabItem,
        count:
          tabItem.id === "all"
            ? orders.length
            : orders.filter((order) => getOrderTabKey(order) === tabItem.id).length,
      })),
    [orders, t, uiCopy]
  );

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }), [locale]);
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
  };

  const columns: AdminTableColumn<OrderListRecord>[] = [
    {
      id: "order",
      header: t("orders.table.order"),
      cell: (order) => (
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold text-foreground">
            {detailsHidden ? uiCopy.privacyHidden : order.internalOrderNumber}
          </p>
          <p className="truncate text-sm text-muted">
            {detailsHidden ? "GoldHelwah" : order.previewProductName || "–"}
          </p>
          <p className="text-xs text-muted">
            <bdi>{detailsHidden ? privacyCopy.hidden : order.trackingNumber}</bdi>
          </p>
        </div>
      ),
    },
    {
      id: "customer",
      header: t("orders.table.customer"),
      cell: (order) => (
        <div className="min-w-0 space-y-0.5">
          <p className="text-foreground">
            {detailsHidden ? uiCopy.privacyHidden : order.customerName || t("common.noCustomer")}
          </p>
          {order.customerEmail || detailsHidden ? (
            <p className="truncate text-xs text-muted">
              <bdi>{detailsHidden ? privacyCopy.hidden : order.customerEmail}</bdi>
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "worker",
      header: uiCopy.assignedWorker,
      cell: (order) => (
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-foreground">
            {detailsHidden ? uiCopy.privacyHidden : order.workshopName || order.employeeName || uiCopy.noWorker}
          </p>
          {!detailsHidden && (order.employeeName || order.assignedWorkerEmail) && order.workshopName ? (
            <p className="truncate text-xs text-muted">
              <bdi>{order.employeeName || order.assignedWorkerEmail}</bdi>
            </p>
          ) : null}
          <p className="text-xs text-muted">
            {order.employeeId
              ? t(getAssignmentStatusMessageKey(order.assignmentStatus))
              : order.workshopId
                ? t("flow.workshops.waitingForManager")
                : t("flow.orderCard.notSent")}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: t("orders.table.status"),
      cell: (order) => {
        const queue = getOrderTabKey(order);
        return (
          <div className="space-y-1">
            <AdminBadge
              variant={
                queue === "pending" ? "danger" : queue === "completed" ? "success" : queue === "cancelled" || queue === "archived" ? "neutral" : "info"
              }
            >
              {t(`trackingStatus.${order.trackingStatus}`)}
            </AdminBadge>
            <p className="text-xs text-muted">
              {order.publicTrackingStage ? t(`publicTrackingStage.${order.publicTrackingStage}`) : t("orders.noPublicStage")}
            </p>
          </div>
        );
      },
    },
    {
      id: "updatedAt",
      header: t("orders.table.dueDate"),
      cell: (order) => <span className="whitespace-nowrap">{formatDate(order.dueDate || order.updatedAt)}</span>,
    },
    {
      id: "action",
      align: "end",
      header: <span className="sr-only">{t("orders.table.action")}</span>,
      cell: (order) => (
        <div className="flex justify-end gap-2">
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

      {privacyModeEnabled ? (
        <AdminCard
          title={privacyCopy.activeBadge}
          description={privacyCopy.activeDescription}
          action={
            <AdminButton
              variant="secondary"
              onClick={() => setPrivacyModeEnabled(false)}
            >
              {privacyCopy.deactivate}
            </AdminButton>
          }
        >
          <p className="text-sm text-muted">{privacyCopy.shortcut}</p>
        </AdminCard>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminTabs tabs={tabs} value={tab} onChange={(value) => setTab(value as OrderTabKey)} />
        <p className="text-sm text-muted">
          {t("orders.resultCount", { count: filteredOrders.length })}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative block sm:max-w-sm sm:flex-1">
          <span className="sr-only">{t("common.search")}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="admin-input admin-input-with-icon"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("orders.searchPlaceholder")}
          />
        </label>
        <label className="block sm:w-64">
          <span className="sr-only">{uiCopy.assignedWorker}</span>
          <select className="admin-select" value={assignedFilter} onChange={(event) => setAssignedFilter(event.target.value)}>
            <option value="all">{uiCopy.assignedWorker}: {t("common.all")}</option>
            {workerChoices.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedOrder ? (
        <div ref={selectedCardRef}>
          {detailsHidden ? (
            <AdminCard
              title={privacyCopy.activeBadge}
              description={privacyCopy.activeDescription}
            >
              <p className="text-sm text-muted">{privacyCopy.shortcut}</p>
            </AdminCard>
          ) : (
            <OrderTrackingCard
              key={selectedOrder.id}
              currentUserRole={currentUserRole}
              customerEmail={selectedOrder.customerEmail}
              emailUpdatesEnabled={selectedOrder.emailUpdatesEnabled}
              initialPublicStage={selectedOrder.publicTrackingStage}
              initialStatus={selectedOrder.trackingStatus}
              locale={locale}
              orderId={selectedOrder.id}
              showTimeline={false}
              trackingNumber={selectedOrder.trackingNumber}
            />
          )}
        </div>
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
