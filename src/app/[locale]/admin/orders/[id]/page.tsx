import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AdminBadge } from "@/components/admin/AdminBadge";
import { getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrderTrackingCard } from "@/components/admin/OrderTrackingCard";
import { adminOrders, employees } from "@/data/adminMock";
import { Link } from "@/i18n/navigation";
import {
  getAssignedEmployeeName,
  getCurrentAdminUser,
  scopeOrdersForUser,
} from "@/lib/admin/currentUser";
import { resolveLocale } from "@/lib/site";

type OrderDetailPageProps = {
  params: Promise<{ id: string; locale: string }>;
};

export default async function AdminOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id, locale: localeParam } = await params;
  const locale = await resolveLocale(Promise.resolve({ locale: localeParam }));
  const t = await getTranslations({ locale, namespace: "Admin" });
  const currentUser = getCurrentAdminUser();
  const order = scopeOrdersForUser(currentUser, adminOrders).find((item) => item.id === id);

  if (!order) {
    notFound();
  }

  const getGoldColorLabel = (value: string) => {
    if (value === "yellow_gold") {
      return t("newOrder.values.yellowGold");
    }

    if (value === "white_gold") {
      return t("newOrder.values.whiteGold");
    }

    if (value === "rose_gold") {
      return t("newOrder.values.roseGold");
    }

    return value;
  };

  const getSurfaceLabel = (value: string) => {
    if (value === "polished") {
      return t("newOrder.values.polished");
    }

    if (value === "matte") {
      return t("newOrder.values.matte");
    }

    if (value === "brushed") {
      return t("newOrder.values.brushed");
    }

    return value;
  };

  const employeeName =
    getAssignedEmployeeName(order.assignedEmployeeId, employees) ?? t("common.unassigned");
  const item = order.items[0];
  const productDetails = [
    { label: t("orders.table.product"), value: item.productName },
    { label: t("orders.trackingNumberLabel"), value: order.trackingNumber },
    { label: t("orders.table.workshop"), value: order.workshopName },
    { label: t("orders.table.customer"), value: order.customerName ?? t("common.noCustomer") },
    { label: t("orders.table.employee"), value: employeeName },
  ];
  const goldDetails = [
    { label: t("newOrder.fields.goldKarat"), value: order.goldDetails.goldKarat || "-" },
    { label: t("newOrder.fields.goldColor"), value: getGoldColorLabel(order.goldDetails.goldColor || "-") },
    { label: t("newOrder.fields.estimatedWeight"), value: order.goldDetails.estimatedWeight || "-" },
    { label: t("newOrder.fields.surface"), value: getSurfaceLabel(order.goldDetails.finishType || "-") },
  ];
  const measurementDetails = [
    { label: t("newOrder.fields.ringSize"), value: order.measurements.ringSize || "-" },
    { label: t("newOrder.fields.braceletSize"), value: order.measurements.braceletSize || "-" },
    { label: t("newOrder.fields.chainLength"), value: order.measurements.chainLength || "-" },
    { label: t("newOrder.fields.customMeasurements"), value: order.measurements.customMeasurements || "-" },
  ];
  const personalizationDetails = [
    {
      label: t("newOrder.fields.nameCustomizationEnabled"),
      value: order.personalization.hasNameCustomization ? t("common.yes") : t("common.no"),
    },
    { label: t("newOrder.fields.nameText"), value: order.personalization.nameText || "-" },
    { label: t("newOrder.fields.language"), value: order.personalization.nameLanguage || "-" },
    { label: t("newOrder.fields.fontStyle"), value: order.personalization.fontStyle || "-" },
    { label: t("newOrder.fields.placement"), value: order.personalization.namePlacement || "-" },
    { label: t("newOrder.fields.engravingText"), value: order.personalization.engravingText || "-" },
    { label: t("newOrder.fields.engravingNotes"), value: order.personalization.engravingNotes || "-" },
  ];
  const stoneDetails = [
    {
      label: t("newOrder.fields.stonesEnabled"),
      value: order.stones.hasStones ? t("common.yes") : t("common.no"),
    },
    { label: t("newOrder.fields.stoneType"), value: order.stones.stoneType || "-" },
    { label: t("newOrder.fields.stoneColor"), value: order.stones.stoneColor || "-" },
    { label: t("newOrder.fields.stoneShape"), value: order.stones.stoneShape || "-" },
    { label: t("newOrder.fields.stoneCount"), value: order.stones.stoneQuantity || "-" },
    { label: t("newOrder.fields.stoneSetting"), value: order.stones.stoneSetting || "-" },
  ];
  const noteDetails = [
    { label: t("newOrder.fields.workshopNotes"), value: order.notes.workshopNotes || "-" },
    { label: t("newOrder.fields.customerNotes"), value: order.notes.customerNotes || "-" },
    { label: t("newOrder.fields.internalNotes"), value: order.notes.adminNotes || "-" },
  ];
  const deliveryDetails = [
    { label: t("newOrder.fields.dueDate"), value: order.dueDate },
    { label: t("newOrder.fields.deliveryNotes"), value: order.notes.deliveryNotes || "-" },
    { label: t("newOrder.fields.packagingNotes"), value: order.notes.packagingNotes || "-" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("orders.detailEyebrow")}
        title={order.internalOrderNumber}
        description={t("orders.detailDescription")}
        meta={
          <>
            <AdminBadge variant="info">{t(`status.${order.status}`)}</AdminBadge>
            <AdminBadge variant="gold">{t(`trackingStatus.${order.trackingStatus}`)}</AdminBadge>
            <AdminBadge variant="info">{t(`priority.${order.priority}`)}</AdminBadge>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className={getAdminButtonClassName({ variant: "secondary" })}
            >
              {t("buttons.updateStatus")}
            </button>
            <button
              type="button"
              className={getAdminButtonClassName({ variant: "secondary" })}
            >
              {t("buttons.assignEmployee")}
            </button>
            <button type="button" className={getAdminButtonClassName({ variant: "danger" })}>
              {t("buttons.archive")}
            </button>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <AdminCard title={t("orders.summaryTitle")} description={t("orders.summaryDescription")}>
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="relative aspect-[4/4.8] overflow-hidden rounded-[1rem] border border-white/10">
                <Image
                  src={item.productImage}
                  alt={item.productName}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 24vw, 100vw"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gold-soft">{item.categoryName}</p>
                  <h2 className="text-2xl font-semibold text-foreground">{item.productName}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {t("orders.itemQuantity", { count: item.quantity })}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {productDetails.map((detail) => (
                    <div
                      key={detail.label}
                      className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3"
                    >
                      <p className="text-sm font-medium text-muted">
                        {detail.label}
                      </p>
                      <p className="mt-2 text-sm text-foreground">{detail.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AdminCard>

          <section className="grid gap-6 xl:grid-cols-2">
            <AdminCard title={t("orders.goldDetailsTitle")}>
              <dl className="grid gap-3 text-sm">
                {goldDetails.map((detail) => (
                  <div key={detail.label} className="flex items-start justify-between gap-4">
                    <dt className="text-muted">{detail.label}</dt>
                    <dd className="text-end text-foreground">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </AdminCard>

            <AdminCard title={t("orders.measurementsTitle")}>
              <dl className="grid gap-3 text-sm">
                {measurementDetails.map((detail) => (
                  <div key={detail.label} className="flex items-start justify-between gap-4">
                    <dt className="text-muted">{detail.label}</dt>
                    <dd className="text-end text-foreground">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </AdminCard>

            <AdminCard title={t("orders.personalizationTitle")}>
              <dl className="grid gap-3 text-sm">
                {personalizationDetails.map((detail) => (
                  <div key={detail.label} className="flex items-start justify-between gap-4">
                    <dt className="text-muted">{detail.label}</dt>
                    <dd className="max-w-[60%] text-end text-foreground">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </AdminCard>

            <AdminCard title={t("orders.stonesTitle")}>
              <dl className="grid gap-3 text-sm">
                {stoneDetails.map((detail) => (
                  <div key={detail.label} className="flex items-start justify-between gap-4">
                    <dt className="text-muted">{detail.label}</dt>
                    <dd className="text-end text-foreground">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </AdminCard>

            <AdminCard title={t("orders.notesTitle")}>
              <div className="space-y-4 text-sm">
                {noteDetails.map((detail) => (
                  <div key={detail.label}>
                    <p className="text-muted">{detail.label}</p>
                    <p className="mt-1 text-foreground">{detail.value}</p>
                  </div>
                ))}
              </div>
            </AdminCard>

            <AdminCard title={t("orders.deliveryTitle")}>
              <div className="space-y-4 text-sm">
                {deliveryDetails.map((detail) => (
                  <div key={detail.label}>
                    <p className="text-muted">{detail.label}</p>
                    <p className="mt-1 text-foreground">{detail.value}</p>
                  </div>
                ))}
              </div>
            </AdminCard>
          </section>
        </div>

        <div className="space-y-6">
          <AdminCard title={t("orders.customerTitle")} description={t("orders.customerDescription")}>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted">{t("orders.table.customer")}</p>
                <p className="mt-1 text-foreground">
                  {order.customerName ?? t("common.noCustomer")}
                </p>
              </div>
              <div>
                <p className="text-muted">{t("orders.customerEmailLabel")}</p>
                <p className="mt-1 text-foreground">{order.customerEmail || "-"}</p>
              </div>
              <div>
                <p className="text-muted">{t("newOrder.fields.customerPhone")}</p>
                <p className="mt-1 text-foreground">{order.customerPhone || "-"}</p>
              </div>
              <div>
                <p className="text-muted">{t("newOrder.fields.customerReference")}</p>
                <p className="mt-1 text-foreground">{order.customerReference || "-"}</p>
              </div>
              <div>
                <p className="text-muted">{t("newOrder.fields.workshop")}</p>
                <p className="mt-1 text-foreground">{order.workshopName}</p>
              </div>
            </div>
          </AdminCard>

          <OrderTrackingCard
            actorName={currentUser.name}
            customerEmail={order.customerEmail}
            emailUpdatesEnabled={order.emailUpdatesEnabled}
            initialEvents={order.trackingEvents}
            initialStatus={order.trackingStatus}
            orderId={order.id}
            trackingNumber={order.trackingNumber}
          />

          <AdminCard title={t("orders.sidebarActionsTitle")}>
            <div className="grid gap-2">
              <button
                type="button"
                className={getAdminButtonClassName({ block: true, variant: "secondary" })}
              >
                {t("buttons.updateStatus")}
              </button>
              <button
                type="button"
                className={getAdminButtonClassName({ block: true, variant: "secondary" })}
              >
                {t("buttons.assignEmployee")}
              </button>
              <Link
                href="/admin/orders"
                className={getAdminButtonClassName({ block: true, variant: "ghost" })}
              >
                {t("buttons.backToOrders")}
              </Link>
            </div>
          </AdminCard>
        </div>
      </section>
    </div>
  );
}
