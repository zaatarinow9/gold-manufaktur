"use client";

import {
  BriefcaseBusiness,
  Clock3,
  Gem,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminCard } from "@/components/admin/AdminCard";
import { adminOrders, employees, managedCategories } from "@/data/adminMock";
import { Link } from "@/i18n/navigation";
import {
  getAssignedEmployeeName,
  getCurrentAdminUser,
  scopeOrdersForUser,
  scopeProductsForUser,
  scopeWorkshopsForUser,
} from "@/lib/admin/currentUser";
import type { WorkshopOrder } from "@/types/admin";

export default function AdminDashboardPage() {
  const t = useTranslations("Admin");
  const currentUser = getCurrentAdminUser();
  const visibleOrders = scopeOrdersForUser(currentUser, adminOrders);
  const visibleProducts = scopeProductsForUser(currentUser);
  const visibleWorkshops = scopeWorkshopsForUser(currentUser);

  const stats = [
    {
      label: t("overview.stats.totalProducts"),
      value: visibleProducts.length,
      badge: t("common.catalogOnly"),
      hint: t("overview.stats.totalProductsHint"),
      icon: <Package className="h-5 w-5" />,
    },
    {
      label: t("overview.stats.activeCategories"),
      value: managedCategories.filter((category) => category.isActive).length,
      badge: t("common.curated"),
      hint: t("overview.stats.activeCategoriesHint"),
      icon: <Gem className="h-5 w-5" />,
    },
    {
      label: t("overview.stats.newOrders"),
      value: visibleOrders.filter((order) =>
        ["draft", "sent_to_workshop"].includes(order.status)
      ).length,
      badge: t("status.draft"),
      hint: t("overview.stats.newOrdersHint"),
      icon: <ShoppingBag className="h-5 w-5" />,
    },
    {
      label: t("overview.stats.inProduction"),
      value: visibleOrders.filter((order) => order.status === "in_production").length,
      badge: t("status.in_production"),
      hint: t("overview.stats.inProductionHint"),
      icon: <Clock3 className="h-5 w-5" />,
    },
    {
      label: t("overview.stats.readyOrders"),
      value: visibleOrders.filter((order) => order.status === "ready").length,
      badge: t("status.ready"),
      hint: t("overview.stats.readyOrdersHint"),
      icon: <BriefcaseBusiness className="h-5 w-5" />,
    },
    {
      label: t("overview.stats.employees"),
      value: visibleWorkshops.reduce(
        (total, workshop) => total + workshop.assignedEmployeeIds.length,
        0
      ),
      badge: t(`roles.${currentUser.role}`),
      hint: t("overview.stats.employeesHint"),
      icon: <Users className="h-5 w-5" />,
    },
  ];

  const recentOrders = [...visibleOrders]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);

  const recentOrderColumns: AdminTableColumn<WorkshopOrder>[] = [
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
      id: "workshop",
      header: t("orders.table.workshop"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="text-foreground">{order.workshopName}</p>
          <p className="text-xs text-muted">{order.customerName ?? t("common.noCustomer")}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: t("orders.table.status"),
      cell: (order) => <AdminBadge variant="gold">{t(`status.${order.status}`)}</AdminBadge>,
    },
    {
      id: "dueDate",
      header: t("orders.table.dueDate"),
      cell: (order) => order.dueDate,
    },
    {
      id: "employee",
      header: t("orders.table.employee"),
      cell: (order) =>
        getAssignedEmployeeName(order.assignedEmployeeId, employees) ??
        t("common.unassigned"),
    },
    {
      id: "action",
      header: t("orders.table.action"),
      align: "end",
      cell: (order) => (
        <Link href={`/admin/orders/${order.id}`} className="admin-button-secondary">
          {t("buttons.viewDetails")}
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={t("overview.eyebrow")}
      title={t("overview.title")}
      description={t("overview.description")}
      actions={
        <Link
          href="/admin/gallery/new-order"
          className={getAdminButtonClassName({ variant: "primary" })}
        >
          {t("buttons.createOrder")}
        </Link>
      }
    />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <AdminStatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <AdminCard
          title={t("overview.recentOrdersTitle")}
          description={t("overview.recentOrdersDescription")}
        >
          <AdminTable
            columns={recentOrderColumns}
            rows={recentOrders}
            getRowKey={(order) => order.id}
            cardTitle={(order) => order.internalOrderNumber}
            emptyState={t("orders.empty")}
          />
        </AdminCard>

        <div className="space-y-6">
          <AdminCard
            title={t("overview.quickActionsTitle")}
            description={t("overview.quickActionsDescription")}
          >
            <div className="grid gap-3">
              <Link
                href="/admin/products"
                className={getAdminButtonClassName({
                  block: true,
                  variant: "primary",
                })}
              >
                {t("overview.actions.addProduct")}
              </Link>
              <Link
                href="/admin/gallery/new-order"
                className={getAdminButtonClassName({ block: true, variant: "secondary" })}
              >
                {t("overview.actions.createOrder")}
              </Link>
              <Link
                href="/admin/options"
                className={getAdminButtonClassName({ block: true, variant: "secondary" })}
              >
                {t("overview.actions.manageOptions")}
              </Link>
              <Link
                href="/admin/employees"
                className={getAdminButtonClassName({ block: true, variant: "secondary" })}
              >
                {t("overview.actions.addEmployee")}
              </Link>
            </div>
          </AdminCard>

          <AdminCard
            title={t("overview.workshopLoadTitle")}
            description={t("overview.workshopLoadDescription")}
          >
            <div className="space-y-3">
              {visibleWorkshops.map((workshop) => (
                <div
                  key={workshop.id}
                  className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{workshop.name}</p>
                      <p className="text-sm text-muted">{workshop.location}</p>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-semibold text-foreground">
                        {workshop.activeOrders}
                      </p>
                      <p className="text-xs text-muted">{t("orders.title")}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted">
                    <span>{workshop.code}</span>
                    <span>{`${workshop.orderLoad}%`}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,rgba(232,201,135,0.95),rgba(196,154,82,0.6))]"
                      style={{ width: `${workshop.orderLoad}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      </section>
    </div>
  );
}
