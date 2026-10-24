import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Package,
  Plus,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPrivacyGuard } from "@/components/admin/AdminPrivacyMode";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Link } from "@/i18n/navigation";
import { getAdminPrivacyUiCopy } from "@/lib/admin/adminCopy.server";
import { getRoleDashboardPath } from "@/lib/admin/access";
import { requireAdminAccess } from "@/lib/admin/auth";
import { localizeNotification } from "@/lib/admin/notificationText";
import { getAdminProducts } from "@/lib/db/adminCatalog";
import { getScopedAdminNotifications } from "@/lib/db/notifications";
import { getScopedOrders } from "@/lib/db/orders";
import { getScopedWorkshops } from "@/lib/db/workshops";
import { resolveLocale } from "@/lib/site";

type AdminDashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const tn = await getTranslations({ locale, namespace: "Admin.notifications" });
  const format = await getFormatter({ locale });
  const access = await requireAdminAccess(locale, ["super_admin", "admin", "employee"]);

  if (access.state !== "authenticated" || !access.user) {
    return (
      <AdminAccessDenied title={t("common.noAccessTitle")} description={t("common.noAccessText")} />
    );
  }

  if (access.user.role === "employee") {
    redirect(getRoleDashboardPath(locale, access.user.role));
  }

  const currentUser = access.user;
  const isSuperAdmin = currentUser.role === "super_admin";
  const privacyCopy = await getAdminPrivacyUiCopy(locale);
  const [orders, workshops, products, notifications] = await Promise.all([
    getScopedOrders(currentUser),
    getScopedWorkshops(currentUser),
    isSuperAdmin ? getAdminProducts(locale) : Promise.resolve([]),
    getScopedAdminNotifications(currentUser),
  ]);

  // Archived and deleted orders must not inflate the operational numbers.
  const activeOrders = orders.filter(
    (order) => !order.archivedAt && !order.deletedAt && order.status !== "archived"
  );
  const recentOrders = [...activeOrders]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 6);
  const newOrders = activeOrders.filter((order) =>
    ["draft", "sent_to_workshop"].includes(order.status)
  ).length;
  const inProduction = activeOrders.filter((order) => order.status === "in_production").length;
  const readyOrders = activeOrders.filter((order) => order.status === "ready").length;
  const visibleProducts = products.filter((product) => product.isActive).length;
  const recentNotifications = notifications.slice(0, 6);
  const firstName = currentUser.name.split(/\s+/)[0] || currentUser.name;

  const quickActions = [
    { href: "/admin/gallery", icon: ShoppingBag, label: t("overview.actions.createOrder") },
    ...(isSuperAdmin
      ? [{ href: "/admin/products", icon: Package, label: t("overview.actions.addProduct") }]
      : []),
    { href: "/admin/employees", icon: UserPlus, label: t("overview.actions.addEmployee") },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t("overview.greeting", { name: firstName })}
        description={format.dateTime(new Date(), { dateStyle: "full" })}
        actions={
          <Link href="/admin/gallery" className={getAdminButtonClassName({ variant: "primary" })}>
            <Plus />
            {t("buttons.createOrder")}
          </Link>
        }
      />

      <section
        aria-label={t("overview.statsLabel")}
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <AdminStatCard
          icon={<ShoppingBag />}
          label={t("overview.stats.newOrders")}
          value={newOrders}
          hint={t("overview.stats.newOrdersHint")}
        />
        <AdminStatCard
          icon={<Clock3 />}
          label={t("overview.stats.inProduction")}
          value={inProduction}
          hint={t("overview.stats.inProductionHint")}
        />
        <AdminStatCard
          icon={<CheckCircle2 />}
          label={t("overview.stats.readyOrders")}
          value={readyOrders}
          hint={t("overview.stats.readyOrdersHint")}
        />
        {isSuperAdmin ? (
          <AdminStatCard
            icon={<Package />}
            label={t("overview.stats.totalProducts")}
            value={visibleProducts}
            hint={t("overview.stats.totalProductsHint")}
          />
        ) : (
          <AdminStatCard
            icon={<Clock3 />}
            label={t("overview.stats.activeOrders")}
            value={activeOrders.length}
          />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <AdminCard
          title={t("overview.recentOrdersTitle")}
          action={
            <Link href="/admin/orders" className={getAdminButtonClassName({ size: "sm", variant: "ghost" })}>
              {t("overview.allOrders")}
              <ChevronRight className="rtl:rotate-180" />
            </Link>
          }
          contentClassName="p-0"
        >
          {recentOrders.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted">{t("overview.noOrders")}</p>
              <Link
                href="/admin/gallery"
                className={getAdminButtonClassName({ className: "mt-3", size: "sm" })}
              >
                <Plus />
                {t("buttons.createOrder")}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.025]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        <AdminPrivacyGuard fallback={privacyCopy.hidden}>
                          <bdi>{order.internalOrderNumber}</bdi>
                        </AdminPrivacyGuard>
                        <span className="text-muted"> · </span>
                        <AdminPrivacyGuard fallback={privacyCopy.hidden}>
                          {order.previewProductName || "–"}
                        </AdminPrivacyGuard>
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {order.workshopName || t("common.unassigned")}
                        {order.dueDate
                          ? ` · ${t("overview.dueOn", {
                              date: format.dateTime(new Date(order.dueDate), { dateStyle: "medium" }),
                            })}`
                          : ""}
                      </p>
                    </div>
                    <AdminBadge variant={order.status === "ready" ? "success" : "gold"}>
                      {t(`status.${order.status}`)}
                    </AdminBadge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <div className="space-y-6">
          <AdminCard title={t("overview.quickActionsTitle")}>
            <div className="grid gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 rounded-[0.625rem] border border-white/[0.06] px-3.5 py-3 text-sm font-medium text-foreground transition hover:border-gold/30 hover:bg-gold/[0.06]"
                >
                  <action.icon className="h-4 w-4 text-gold-soft" />
                  <span className="flex-1">{action.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" />
                </Link>
              ))}
            </div>
          </AdminCard>

          <AdminCard title={t("overview.notificationsTitle")} contentClassName="p-0">
            {recentNotifications.length === 0 ? (
              <p className="flex items-center gap-2 px-5 py-6 text-sm text-muted">
                <Bell className="h-4 w-4" />
                {t("overview.noNotifications")}
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {recentNotifications.map((notification) => {
                  const text = localizeNotification(notification, tn);
                  const content = (
                    <>
                      <div className="flex items-start gap-2">
                        {!notification.isRead ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label={t("overview.unread")} />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{text.title}</p>
                          {text.message ? (
                            <p className="mt-0.5 line-clamp-2 text-sm text-muted [overflow-wrap:anywhere]">
                              {text.message}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-text-soft">
                            {format.relativeTime(new Date(notification.createdAt))}
                          </p>
                        </div>
                      </div>
                    </>
                  );

                  return (
                    <li key={notification.id}>
                      {notification.linkPath ? (
                        <Link href={notification.linkPath} className="block px-5 py-3.5 transition hover:bg-white/[0.025]">
                          {content}
                        </Link>
                      ) : (
                        <div className="px-5 py-3.5">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>

          {workshops.length > 0 ? (
            <AdminCard title={t("overview.workshopLoadTitle")}>
              <ul className="space-y-4">
                {workshops.map((workshop) => (
                  <li key={workshop.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{workshop.name}</span>
                      <span className="text-muted">
                        {t("overview.workshopOrders", { count: workshop.activeOrders })}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gold/80"
                        style={{ width: `${Math.min(100, Math.max(0, workshop.onTimeRate))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-soft">
                      {t("overview.onTimeRate", { rate: workshop.onTimeRate })}
                    </p>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ) : null}
        </div>
      </section>
    </div>
  );
}
