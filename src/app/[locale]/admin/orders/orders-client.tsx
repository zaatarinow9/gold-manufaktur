"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton, getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { getAdminPrivacyUiCopy } from "@/lib/admin/privacy";
import {
  getAssignmentStatusMessageKey,
  getAssignmentStatusVariant,
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

function getOrdersUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      assignedWorker: "\u0627\u0644\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u0633\u0646\u062f",
      archived: "\u0627\u0644\u0623\u0631\u0634\u064a\u0641",
      assigned: "\u0645\u0633\u0646\u062f",
      cancelled: "\u0645\u0644\u063a\u0649",
      completed: "\u0645\u0643\u062a\u0645\u0644",
      inProgress: "\u0642\u064a\u062f \u0627\u0644\u062a\u0646\u0641\u064a\u0630",
      pending: "\u062c\u062f\u064a\u062f / \u0645\u0639\u0644\u0642",
      noWorker: "\u063a\u064a\u0631 \u0645\u0633\u0646\u062f",
      privacyHidden: "\u062a\u0645 \u0625\u062e\u0641\u0627\u0621 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0645\u0624\u0642\u062a\u0627\u064b",
      reveal: "\u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
      hideAgain: "\u0625\u062e\u0641\u0627\u0621 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
      shipped: "\u0642\u064a\u062f \u0627\u0644\u0634\u062d\u0646",
    };
  }

  if (locale === "de") {
    return {
      assignedWorker: "Zugewiesener Bearbeiter",
      archived: "Archiv",
      assigned: "Zugewiesen",
      cancelled: "Storniert",
      completed: "Abgeschlossen",
      inProgress: "In Bearbeitung",
      pending: "Neu / Offen",
      noWorker: "Nicht zugewiesen",
      privacyHidden: "Auftragsdetails sind voruebergehend ausgeblendet",
      reveal: "Details einblenden",
      hideAgain: "Details wieder ausblenden",
      shipped: "Versand",
    };
  }

  return {
    assignedWorker: "Assigned worker",
    archived: "Archived",
    assigned: "Assigned",
    cancelled: "Cancelled",
    completed: "Completed",
    inProgress: "In progress",
    pending: "New / Pending",
    noWorker: "Unassigned",
    privacyHidden: "Order details are temporarily hidden",
    reveal: "Reveal details",
    hideAgain: "Hide details again",
    shipped: "Shipped",
  };
}

function getQueueLabel(
  key: Exclude<OrderTabKey, "all">,
  uiCopy: ReturnType<typeof getOrdersUiCopy>
) {
  switch (key) {
    case "pending":
      return uiCopy.pending;
    case "assigned":
      return uiCopy.assigned;
    case "in_progress":
      return uiCopy.inProgress;
    case "shipped":
      return uiCopy.shipped;
    case "completed":
      return uiCopy.completed;
    case "cancelled":
      return uiCopy.cancelled;
    case "archived":
      return uiCopy.archived;
  }
}

export function AdminOrdersClient({
  canCreate,
  currentUserRole,
  employees,
  locale,
  orders,
}: AdminOrdersClientProps) {
  const t = useTranslations("Admin");
  const uiCopy = getOrdersUiCopy(locale);
  const privacyCopy = getAdminPrivacyUiCopy(locale);
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

  const columns: AdminTableColumn<OrderListRecord>[] = [
    {
      id: "order",
      header: t("orders.table.order"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            {detailsHidden ? uiCopy.privacyHidden : order.internalOrderNumber}
          </p>
          <p className="text-xs text-muted">
            {detailsHidden ? "GoldHelwah" : order.previewProductName || "-"}
          </p>
        </div>
      ),
    },
    {
      id: "trackingNumber",
      header: t("orders.table.trackingNumber"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {detailsHidden ? privacyCopy.hidden : order.trackingNumber}
          </p>
          <p className="text-xs text-muted">{t(`trackingStatus.${order.trackingStatus}`)}</p>
        </div>
      ),
    },
    {
      id: "customer",
      header: t("orders.table.customer"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="text-foreground">
            {detailsHidden ? uiCopy.privacyHidden : order.customerName || t("common.noCustomer")}
          </p>
          <p className="text-xs text-muted">
            {detailsHidden ? privacyCopy.hidden : order.customerEmail || "-"}
          </p>
        </div>
      ),
    },
    {
      id: "worker",
      header: uiCopy.assignedWorker,
      cell: (order) => (
        <div className="space-y-1">
          <p className="text-foreground">
            {detailsHidden
              ? uiCopy.privacyHidden
              : order.assignedWorkerEmail || order.employeeName || uiCopy.noWorker}
          </p>
          <p className="text-xs text-muted">
            {detailsHidden ? privacyCopy.hidden : order.workshopName || "-"}
          </p>
        </div>
      ),
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
          <AdminBadge variant="info">{t(`trackingStatus.${order.trackingStatus}`)}</AdminBadge>
          <AdminBadge variant={getAssignmentStatusVariant(order.assignmentStatus)}>
            {t(getAssignmentStatusMessageKey(order.assignmentStatus))}
          </AdminBadge>
          <AdminBadge variant={getOrderTabKey(order) === "pending" ? "danger" : "neutral"}>
            {getQueueLabel(getOrderTabKey(order), uiCopy)}
          </AdminBadge>
        </div>
      ),
    },
    {
      id: "updatedAt",
      header: t("orders.table.dueDate"),
      cell: (order) => order.dueDate || order.updatedAt.slice(0, 10),
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
          {t("products.resultCount", { count: filteredOrders.length })}
        </p>
      </div>

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
            value={assignedFilter}
            onChange={(event) => setAssignedFilter(event.target.value)}
            label={uiCopy.assignedWorker}
          >
            <option value="all">{t("common.all")}</option>
            {workerChoices.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </AdminSelect>
        </AdminToolbar>
      </AdminCard>

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
              employees={employees}
              initialAssignmentNote={selectedOrder.assignmentNote}
              initialAssignmentStatus={selectedOrder.assignmentStatus}
              initialEmployeeId={selectedOrder.employeeId}
              initialEmployeeNote={selectedOrder.employeeNote}
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
