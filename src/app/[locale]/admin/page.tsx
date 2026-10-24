import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  ImageOff,
  Inbox,
  type LucideIcon,
  Package,
  PackagePlus,
  Plus,
  ShoppingBag,
  Tags,
  UserPlus,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminNotificationsPanel } from "@/components/admin/AdminNotificationsPanel";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPrivacyGuard } from "@/components/admin/AdminPrivacyMode";
import { Link } from "@/i18n/navigation";
import { getAdminPrivacyUiCopy } from "@/lib/admin/adminCopy.server";
import { getRoleDashboardPath } from "@/lib/admin/access";
import { requireAdminAccess } from "@/lib/admin/auth";
import { localizeNotification } from "@/lib/admin/notificationText";
import { getAdminCategories, getAdminProducts } from "@/lib/db/adminCatalog";
import { getUnreadCustomerInquiryCount } from "@/lib/db/inquiries";
import { getScopedAdminNotifications } from "@/lib/db/notifications";
import { getScopedOrders } from "@/lib/db/orders";
import { resolveLocale } from "@/lib/site";

type AdminDashboardPageProps = {
  params: Promise<{ locale: string }>;
};

type Tile = { count: number; hint: string; href: string; icon: LucideIcon; label: string; tone?: "attention" };

export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const tn = await getTranslations({ locale, namespace: "Admin.notifications" });
  const format = await getFormatter({ locale });
  const access = await requireAdminAccess(locale, ["super_admin", "admin", "employee"]);

  if (access.state !== "authenticated" || !access.user) {
    return <AdminAccessDenied title={t("common.noAccessTitle")} description={t("common.noAccessText")} />;
  }

  if (access.user.role === "employee") {
    redirect(getRoleDashboardPath(locale, access.user.role));
  }

  const currentUser = access.user;
  const isSuperAdmin = currentUser.role === "super_admin";
  const privacyCopy = await getAdminPrivacyUiCopy(locale);
  const [orders, products, categories, notifications, openInquiries] = await Promise.all([
    getScopedOrders(currentUser),
    isSuperAdmin ? getAdminProducts(locale) : Promise.resolve([]),
    isSuperAdmin ? getAdminCategories(locale) : Promise.resolve([]),
    getScopedAdminNotifications(currentUser, 12),
    getUnreadCustomerInquiryCount().catch(() => 0),
  ]);

  // Archived and deleted orders must not inflate the operational numbers.
  const activeOrders = orders.filter((order) => !order.archivedAt && !order.deletedAt && order.status !== "archived");
  const recentOrders = [...activeOrders].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 6);
  const newOrders = activeOrders.filter((order) => ["draft", "sent_to_workshop"].includes(order.status)).length;
  const inProduction = activeOrders.filter((order) => order.status === "in_production").length;
  const readyOrders = activeOrders.filter((order) => order.status === "ready").length;
  const firstName = currentUser.name.split(/\s+/)[0] || currentUser.name;

  const tiles: Tile[] = [
    { count: newOrders, hint: t("overview.stats.newOrdersHint"), href: "/admin/orders", icon: ShoppingBag, label: t("overview.stats.newOrders"), tone: newOrders > 0 ? "attention" : undefined },
    { count: openInquiries, hint: t("overview.stats.inquiriesHint"), href: "/admin/inquiries", icon: Inbox, label: t("overview.stats.inquiries"), tone: openInquiries > 0 ? "attention" : undefined },
    { count: inProduction, hint: t("overview.stats.inProductionHint"), href: "/admin/orders", icon: Clock3, label: t("overview.stats.inProduction") },
    { count: readyOrders, hint: t("overview.stats.readyOrdersHint"), href: "/admin/orders", icon: CheckCircle2, label: t("overview.stats.readyOrders") },
  ];

  const visibleProducts = products.filter((product) => product.isActive);
  const catalogChecks = isSuperAdmin
    ? [
        { count: visibleProducts.length, href: "/admin/products", icon: Package, label: t("overview.catalog.visible") },
        { count: products.length - visibleProducts.length, href: "/admin/products", icon: Package, label: t("overview.catalog.hidden") },
        { count: products.filter((product) => !product.imageUrl && product.gallery.length === 0).length, href: "/admin/products", icon: ImageOff, label: t("overview.catalog.noPhoto"), warn: true },
        {
          count: categories.filter((category) => category.isActive && !products.some((product) => product.isActive && product.categoryId === category.id)).length,
          href: "/admin/categories",
          icon: Tags,
          label: t("overview.catalog.emptyCategories"),
          warn: true,
        },
      ]
    : [];

  const quickActions = [
    { href: "/admin/gallery", icon: ShoppingBag, label: t("overview.actions.createOrder") },
    ...(isSuperAdmin ? [{ href: "/admin/products?new=1", icon: PackagePlus, label: t("overview.actions.addProduct") }] : []),
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

      <section aria-label={t("overview.statsLabel")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="admin-panel group flex flex-col gap-3 p-4 transition hover:border-gold/30"
            data-tone={tile.tone}
          >
            <span className="flex items-center justify-between gap-2 text-sm text-muted">
              <span className="flex items-center gap-2">
                <tile.icon className={tile.tone ? "h-4 w-4 text-gold" : "h-4 w-4 text-gold-soft/70"} />
                {tile.label}
              </span>
              <ChevronRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100 rtl:rotate-180" />
            </span>
            <span className={tile.tone ? "text-3xl font-semibold tabular-nums text-gold-soft" : "text-3xl font-semibold tabular-nums text-foreground"}>
              {tile.count}
            </span>
            <span className="text-xs text-text-soft">{tile.hint}</span>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
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
                <Link href="/admin/gallery" className={getAdminButtonClassName({ className: "mt-3", size: "sm" })}>
                  <Plus />
                  {t("buttons.createOrder")}
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/admin/orders/${order.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.025]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          <AdminPrivacyGuard fallback={privacyCopy.hidden}>
                            <bdi>{order.internalOrderNumber}</bdi>
                          </AdminPrivacyGuard>
                          <span className="text-muted"> – </span>
                          <AdminPrivacyGuard fallback={privacyCopy.hidden}>{order.previewProductName || "–"}</AdminPrivacyGuard>
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted">
                          {order.workshopName || t("common.unassigned")}
                          {order.dueDate
                            ? `, ${t("overview.dueOn", { date: format.dateTime(new Date(order.dueDate), { dateStyle: "medium" }) })}`
                            : ""}
                        </p>
                      </div>
                      <AdminBadge variant={order.status === "ready" ? "success" : "gold"}>{t(`status.${order.status}`)}</AdminBadge>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          {isSuperAdmin ? (
            <AdminCard title={t("overview.catalog.title")} description={t("overview.catalog.description")} contentClassName="p-0">
              <ul className="grid divide-white/[0.05] sm:grid-cols-2 sm:divide-x rtl:sm:divide-x-reverse">
                {catalogChecks.map((check) => (
                  <li key={check.label} className="border-t border-white/[0.05] first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                    <Link href={check.href} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.025]">
                      <check.icon className={check.warn && check.count > 0 ? "h-4 w-4 text-amber-300" : "h-4 w-4 text-muted"} />
                      <span className="flex-1 text-sm text-foreground">{check.label}</span>
                      <span className={check.warn && check.count > 0 ? "font-semibold tabular-nums text-amber-200" : "font-semibold tabular-nums text-foreground"}>
                        {check.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <AdminNotificationsPanel
            locale={locale}
            notifications={notifications.map((notification) => {
              const text = localizeNotification(notification, tn);
              return {
                id: notification.id,
                isRead: notification.isRead,
                isStale: notification.isStale,
                linkPath: notification.linkPath,
                message: text.message,
                time: format.relativeTime(new Date(notification.createdAt)),
                title: text.title,
              };
            })}
          />

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
        </div>
      </section>
    </div>
  );
}
