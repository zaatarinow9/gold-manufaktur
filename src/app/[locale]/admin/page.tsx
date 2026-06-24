import {
  BriefcaseBusiness,
  Clock3,
  Gem,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPrivacyGuard } from "@/components/admin/AdminPrivacyMode";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminTable, type AdminTableColumn } from "@/components/admin/AdminTable";
import { Link } from "@/i18n/navigation";
import { getRoleDashboardPath } from "@/lib/admin/access";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getAdminPrivacyUiCopy } from "@/lib/admin/privacy";
import { getScopedAdminNotifications } from "@/lib/db/notifications";
import { getScopedOrders, type OrderListRecord } from "@/lib/db/orders";
import { getAdminCategories, getAdminProducts } from "@/lib/db/adminCatalog";
import { getScopedEmployees } from "@/lib/db/employees";
import { getScopedWorkshops } from "@/lib/db/workshops";
import { resolveLocale } from "@/lib/site";

type AdminDashboardPageProps = {
  params: Promise<{ locale: string }>;
};

function formatNotificationDate(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminDashboardPage({
  params,
}: AdminDashboardPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const access = await requireAdminAccess(locale, [
    "super_admin",
    "admin",
    "employee",
  ]);

  if (access.state !== "authenticated" || !access.user) {
    return (
      <AdminAccessDenied
        title={t("common.noAccessTitle")}
        description={t("common.noAccessText")}
      />
    );
  }

  if (access.user.role === "employee") {
    redirect(getRoleDashboardPath(locale, access.user.role));
  }

  const currentUser = access.user;
  const privacyCopy = getAdminPrivacyUiCopy(locale);
  const renderSensitive = (
    children: React.ReactNode,
    fallback: React.ReactNode = privacyCopy.hidden
  ) => <AdminPrivacyGuard fallback={fallback}>{children}</AdminPrivacyGuard>;
  const [orders, workshops, employees, categories, products, notifications] =
    await Promise.all([
      getScopedOrders(currentUser),
      getScopedWorkshops(currentUser),
      getScopedEmployees(currentUser),
      getAdminCategories(locale),
      getAdminProducts(locale),
      getScopedAdminNotifications(currentUser),
    ]);

  const recentOrders = [...orders]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);

  const activeCategories = categories.filter((category) => category.isActive).length;
  const activeProducts = products.filter((product) => product.isActive).length;
  const newOrders = orders.filter((order) =>
    ["draft", "sent_to_workshop"].includes(order.status)
  ).length;
  const inProduction = orders.filter((order) => order.status === "in_production").length;
  const readyOrders = orders.filter((order) => order.status === "ready").length;

  const stats = [
    {
      badge: t("common.catalogOnly"),
      hint: t("overview.stats.totalProductsHint"),
      icon: <Package className="h-5 w-5" />,
      label: t("overview.stats.totalProducts"),
      value: activeProducts,
    },
    {
      badge: t("common.curated"),
      hint: t("overview.stats.activeCategoriesHint"),
      icon: <Gem className="h-5 w-5" />,
      label: t("overview.stats.activeCategories"),
      value: activeCategories,
    },
    {
      badge: t("status.draft"),
      hint: t("overview.stats.newOrdersHint"),
      icon: <ShoppingBag className="h-5 w-5" />,
      label: t("overview.stats.newOrders"),
      value: newOrders,
    },
    {
      badge: t("status.in_production"),
      hint: t("overview.stats.inProductionHint"),
      icon: <Clock3 className="h-5 w-5" />,
      label: t("overview.stats.inProduction"),
      value: inProduction,
    },
    {
      badge: t("status.ready"),
      hint: t("overview.stats.readyOrdersHint"),
      icon: <BriefcaseBusiness className="h-5 w-5" />,
      label: t("overview.stats.readyOrders"),
      value: readyOrders,
    },
    {
      badge: t(`roles.${currentUser.role}`),
      hint: t("overview.stats.employeesHint"),
      icon: <Users className="h-5 w-5" />,
      label: t("overview.stats.employees"),
      value: employees.length,
    },
  ];
  const quickActions =
    currentUser.role === "super_admin"
      ? [
          {
            href: "/admin/gallery/new-order",
            label: t("overview.actions.createOrder"),
            variant: "primary" as const,
          },
          {
            href: "/admin/products",
            label: t("overview.actions.addProduct"),
            variant: "secondary" as const,
          },
          {
            href: "/admin/options",
            label: t("overview.actions.manageOptions"),
            variant: "secondary" as const,
          },
          {
            href: "/admin/employees",
            label: t("overview.actions.addEmployee"),
            variant: "secondary" as const,
          },
        ]
      : [
          {
            href: "/admin/gallery/new-order",
            label: t("overview.actions.createOrder"),
            variant: "primary" as const,
          },
          {
            href: "/admin/orders",
            label: t("orders.title"),
            variant: "secondary" as const,
          },
          {
            href: "/admin/employees",
            label: t("overview.actions.addEmployee"),
            variant: "secondary" as const,
          },
        ];

  const recentOrderColumns: AdminTableColumn<OrderListRecord>[] = [
    {
      id: "order",
      header: t("orders.table.order"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            {renderSensitive(order.internalOrderNumber)}
          </p>
          <p className="text-xs text-muted">
            {renderSensitive(order.previewProductName || "-", privacyCopy.hidden)}
          </p>
        </div>
      ),
    },
    {
      id: "workshop",
      header: t("orders.table.workshop"),
      cell: (order) => (
        <div className="space-y-1">
          <p className="text-foreground">{order.workshopName || "-"}</p>
          <p className="text-xs text-muted">
            {renderSensitive(order.customerName || t("common.noCustomer"))}
          </p>
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
      cell: (order) => order.dueDate || "-",
    },
    {
      id: "employee",
      header: t("orders.table.employee"),
      cell: (order) => order.employeeName || t("common.unassigned"),
    },
    {
      id: "action",
      align: "end",
      header: t("orders.table.action"),
      cell: (order) => (
        <Link
          href={`/admin/orders/${order.id}`}
          className="admin-button-secondary"
        >
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
          cardTitle={(order) => renderSensitive(order.internalOrderNumber)}
          emptyState={t("orders.empty")}
        />
      </AdminCard>

        <div className="space-y-6">
          <AdminCard
            title={t("overview.quickActionsTitle")}
            description={t("overview.quickActionsDescription")}
          >
            <div className="grid gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={getAdminButtonClassName({
                    block: true,
                    variant: action.variant,
                  })}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="Notifications" description="Recent updates for your role and workshop.">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{notification.title}</p>
                        <p className="mt-1 text-sm text-muted">{notification.message}</p>
                      </div>
                      <AdminBadge variant={notification.isRead ? "neutral" : "gold"}>
                        {notification.isRead ? "Read" : "New"}
                      </AdminBadge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                      <span>{formatNotificationDate(locale, notification.createdAt)}</span>
                      {notification.linkPath ? (
                        <Link href={notification.linkPath} className="text-gold-soft">
                          {t("buttons.viewDetails")}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          <AdminCard
            title={t("overview.workshopLoadTitle")}
            description={t("overview.workshopLoadDescription")}
          >
            <div className="space-y-3">
              {workshops.map((workshop) => (
                <div
                  key={workshop.id}
                  className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{workshop.name}</p>
                      <p className="text-sm text-muted">{workshop.location || workshop.code}</p>
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
                    <span>{`${workshop.onTimeRate}%`}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,rgba(232,201,135,0.95),rgba(196,154,82,0.6))]"
                      style={{ width: `${workshop.onTimeRate}%` }}
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
