import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { getAdminButtonClassName } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmployeeTaskCard } from "@/components/admin/EmployeeTaskCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPrivacyGuard } from "@/components/admin/AdminPrivacyMode";
import { OrderTrackingCard } from "@/components/admin/OrderTrackingCard";
import { PhoneInline } from "@/components/site/PhoneInline";
import { Link } from "@/i18n/navigation";
import { getOrderWorkflowCopy } from "@/lib/admin/orderWorkflow";
import { requireAdminAccess } from "@/lib/admin/auth";
import { getAdminPrivacyUiCopy } from "@/lib/admin/privacy";
import { getScopedEmployees } from "@/lib/db/employees";
import { getScopedOrderDetail } from "@/lib/db/orders";
import { resolveLocale } from "@/lib/site";

type OrderDetailPageProps = {
  params: Promise<{ id: string; locale: string }>;
};

const fieldTranslationKeys: Record<string, string> = {
  adminNotes: "newOrder.fields.internalNotes",
  braceletSize: "newOrder.fields.braceletSize",
  chainLength: "newOrder.fields.chainLength",
  customerNotes: "newOrder.fields.customerNotes",
  deliveryNotes: "newOrder.fields.deliveryNotes",
  engravingText: "newOrder.fields.engravingText",
  goldColor: "newOrder.fields.goldColor",
  goldKarat: "newOrder.fields.goldKarat",
  legacyNotes: "newOrder.fields.internalNotes",
  nameCustomizationEnabled: "newOrder.fields.nameCustomizationEnabled",
  nameLanguage: "newOrder.fields.nameLanguage",
  nameText: "newOrder.fields.nameText",
  packagingNotes: "newOrder.fields.packagingNotes",
  qualityRequirements: "newOrder.fields.qualityRequirements",
  ringSize: "newOrder.fields.ringSize",
  specialInstructions: "newOrder.fields.attachmentNotes",
  stoneColor: "newOrder.fields.stoneColor",
  stoneType: "newOrder.fields.stoneType",
  weightGrams: "newOrder.fields.estimatedWeight",
  workshopNotes: "newOrder.fields.workshopNotes",
};

function humanizeKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getLabel(t: Awaited<ReturnType<typeof getTranslations>>, key: string) {
  const translationKey = fieldTranslationKeys[key];
  return translationKey ? t(translationKey) : humanizeKey(key);
}

function formatDetailValue(locale: string, key: string, value: string) {
  if (key !== "customerLanguage") {
    return value;
  }

  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(value) ?? value;
  } catch {
    return value;
  }
}

function getEmailLogVariant(status: "failed" | "pending" | "sent" | "skipped") {
  if (status === "sent") {
    return "success" as const;
  }

  if (status === "failed") {
    return "danger" as const;
  }

  if (status === "skipped") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getEmailLogErrorMessage(
  t: Awaited<ReturnType<typeof getTranslations>>,
  errorMessage: string
) {
  const normalized = errorMessage.trim();

  if (!normalized) {
    return "";
  }

  switch (normalized) {
    case "duplicate_customer_email":
      return t("orders.emailLogDuplicateSkipped");
    case "smtp_invalid_port":
    case "smtp_missing_password":
    case "smtp_not_configured":
      return t("orders.emailLogSmtpNotice");
    default:
      return /^[A-Z0-9_]+$/i.test(normalized)
        ? t("orders.emailLogErrorFallback")
        : normalized;
  }
}

function getEmailTemplateLabel(
  t: Awaited<ReturnType<typeof getTranslations>>,
  templateType: "order_confirmation" | "public_stage_update" | null
) {
  if (templateType === "order_confirmation") {
    return t("emailTemplateType.orderConfirmation");
  }

  if (templateType === "public_stage_update") {
    return t("emailTemplateType.publicStageUpdate");
  }

  return t("common.notProvided");
}

function renderKeyValueRows(
  locale: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
  values: Record<string, string>,
  fallbackValue: string
) {
  const rows = Object.entries(values).filter((entry) => entry[1].trim().length > 0);

  if (rows.length === 0) {
    return <p className="text-sm text-muted">{fallbackValue}</p>;
  }

  return (
    <dl className="grid gap-3 text-sm">
      {rows.map(([key, value]) => (
        <div key={key} className="flex items-start justify-between gap-4">
          <dt className="text-muted">{getLabel(t, key)}</dt>
          <dd className="max-w-[60%] text-end text-foreground">
            {formatDetailValue(locale, key, value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatSelectedOptionValue(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  return typeof value === "string" ? value.trim() : "";
}

function renderSelectedOptionsRows(
  selectedOptions: Array<{ label: string; value: unknown }>,
  fallbackValue: string
) {
  const rows = selectedOptions
    .map((option) => ({
      label: option.label,
      value: formatSelectedOptionValue(option.value),
    }))
    .filter((option) => option.value.length > 0);

  if (rows.length === 0) {
    return <p className="text-sm text-muted">{fallbackValue}</p>;
  }

  return (
    <dl className="grid gap-3 text-sm">
      {rows.map((option) => (
        <div
          key={`${option.label}-${option.value}`}
          className="flex items-start justify-between gap-4"
        >
          <dt className="text-muted">{option.label}</dt>
          <dd className="max-w-[60%] text-end text-foreground">{option.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id, locale: localeParam } = await params;
  const locale = await resolveLocale(Promise.resolve({ locale: localeParam }));
  const t = await getTranslations({ locale, namespace: "Admin" });
  const copy = getOrderWorkflowCopy(locale);
  const privacyCopy = getAdminPrivacyUiCopy(locale);
  const access = await requireAdminAccess(
    locale,
    ["super_admin", "admin", "employee"],
    `/${locale}/admin/orders/${id}`
  );

  if (access.state !== "authenticated" || !access.user) {
    return (
      <AdminAccessDenied
        title={t("common.noAccessTitle")}
        description={t("common.noAccessText")}
      />
    );
  }

  const isEmployeeView = access.user.role === "employee";
  const [order, employees] = await Promise.all([
    getScopedOrderDetail(access.user, id),
    getScopedEmployees(access.user),
  ]);

  if (!order) {
    return (
      <AdminAccessDenied
        title={t("common.noAccessTitle")}
        description={t("common.noAccessText")}
      />
    );
  }

  const item = order.items[0];
  const notProvided = t("common.notProvided");
  const renderSensitive = (
    children: React.ReactNode,
    fallback: React.ReactNode = privacyCopy.hidden
  ) => <AdminPrivacyGuard fallback={fallback}>{children}</AdminPrivacyGuard>;
  const renderPrivacyFallbackCard = (title: string, description?: string) => (
    <AdminCard title={title} description={description}>
      <p className="text-sm text-muted">{privacyCopy.activeDescription}</p>
      <p className="mt-2 text-xs text-muted">{privacyCopy.shortcut}</p>
    </AdminCard>
  );

  const summaryDetails = [
    {
      label: t("orders.table.product"),
      sensitive: false,
      value: item?.productName || order.previewProductName || notProvided,
    },
    {
      label: t("orders.trackingNumberLabel"),
      sensitive: true,
      value: order.trackingNumber,
    },
    {
      label: t("orders.table.workshop"),
      sensitive: false,
      value: order.workshopName || notProvided,
    },
    ...(!isEmployeeView
      ? [
          {
            label: t("orders.table.customer"),
            sensitive: true,
            value: order.customerName || t("common.noCustomer"),
          },
        ]
      : []),
    {
      label: t("orders.table.employee"),
      sensitive: false,
      value:
        order.assignedWorkerEmail || order.employeeName || t("common.unassigned"),
    },
    {
      label: t("newOrder.fields.totalAmount"),
      sensitive: false,
      value:
        order.totalAmount !== null ? `${order.totalAmount} ${order.currency}` : notProvided,
    },
    {
      label: t("newOrder.fields.dueDate"),
      sensitive: false,
      value: order.dueDate || notProvided,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("orders.detailEyebrow")}
        title={renderSensitive(order.internalOrderNumber)}
        description={t("orders.detailDescription")}
        meta={
          <>
            <AdminBadge variant="gold">
              {order.publicTrackingStage
                ? t(`publicTrackingStage.${order.publicTrackingStage}`)
                : t("orders.noPublicStage")}
            </AdminBadge>
            <AdminBadge variant="info">{t(`status.${order.status}`)}</AdminBadge>
            <AdminBadge variant="neutral">
              {t(`trackingStatus.${order.trackingStatus}`)}
            </AdminBadge>
            <AdminBadge variant="info">{t(`priority.${order.priority}`)}</AdminBadge>
          </>
        }
        actions={
          <Link
            href={isEmployeeView ? "/admin/my-tasks" : "/admin/orders"}
            className={getAdminButtonClassName({ variant: "ghost" })}
          >
            {isEmployeeView
              ? locale === "de"
                ? "Zurueck zu meinen Aufgaben"
                : locale === "ar"
                  ? "\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0645\u0647\u0627\u0645\u064a"
                  : "Back to my tasks"
              : t("buttons.backToOrders")}
          </Link>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <AdminCard title={t("orders.summaryTitle")} description={t("orders.summaryDescription")}>
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="relative aspect-[4/4.8] overflow-hidden rounded-[1rem] border border-white/10">
                {item?.productImage ? (
                  <Image
                    src={item.productImage}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1280px) 24vw, 100vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-white/4 text-sm text-muted">
                    {item?.productName || order.previewProductName || notProvided}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gold-soft">{item?.categoryName || notProvided}</p>
                  <h2 className="text-2xl font-semibold text-foreground">
                    {item?.productName || order.previewProductName || notProvided}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {t("orders.itemQuantity", {
                      count: item?.quantity ?? order.itemCount ?? 1,
                    })}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {summaryDetails.map((detail) => (
                    <div
                      key={detail.label}
                      className="rounded-[0.95rem] border border-white/8 bg-white/4 px-4 py-3"
                    >
                      <p className="text-sm font-medium text-muted">{detail.label}</p>
                      <p className="mt-2 text-sm text-foreground">
                        {detail.sensitive ? renderSensitive(detail.value) : detail.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AdminCard>

          {order.items.length > 1 ? (
            <AdminCard title={copy.itemsTitle}>
              <div className="space-y-4">
                {order.items.map((orderItem) => (
                  <div
                    key={orderItem.id}
                    className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{orderItem.productName}</p>
                        <p className="text-xs text-muted">
                          {orderItem.productSku} {" | "} {orderItem.categoryName}
                        </p>
                      </div>
                      <AdminBadge variant="neutral">
                        {t("orders.itemQuantity", { count: orderItem.quantity })}
                      </AdminBadge>
                    </div>
                    <div className="mt-4">
                      {renderSensitive(
                        renderSelectedOptionsRows(orderItem.selectedOptions, notProvided),
                        <p className="text-sm text-muted">{privacyCopy.activeDescription}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-2">
            <AdminPrivacyGuard
              fallback={renderPrivacyFallbackCard(
                t("newOrder.additionalOptionsTitle"),
                t("newOrder.additionalOptionsDescription")
              )}
            >
              <AdminCard
                title={t("newOrder.additionalOptionsTitle")}
                description={t("newOrder.additionalOptionsDescription")}
              >
                {item ? (
                  renderSelectedOptionsRows(item.selectedOptions, notProvided)
                ) : (
                  <p className="text-sm text-muted">{notProvided}</p>
                )}
              </AdminCard>
            </AdminPrivacyGuard>

            <AdminPrivacyGuard
              fallback={renderPrivacyFallbackCard(t("orders.goldDetailsTitle"))}
            >
              <AdminCard title={t("orders.goldDetailsTitle")}>
                {renderKeyValueRows(locale, t, order.goldDetails, notProvided)}
              </AdminCard>
            </AdminPrivacyGuard>

            <AdminPrivacyGuard
              fallback={renderPrivacyFallbackCard(t("orders.measurementsTitle"))}
            >
              <AdminCard title={t("orders.measurementsTitle")}>
                {renderKeyValueRows(locale, t, order.measurements, notProvided)}
              </AdminCard>
            </AdminPrivacyGuard>

            <AdminPrivacyGuard
              fallback={renderPrivacyFallbackCard(t("orders.personalizationTitle"))}
            >
              <AdminCard title={t("orders.personalizationTitle")}>
                {renderKeyValueRows(locale, t, order.personalization, notProvided)}
              </AdminCard>
            </AdminPrivacyGuard>

            <AdminPrivacyGuard
              fallback={renderPrivacyFallbackCard(t("orders.stonesTitle"))}
            >
              <AdminCard title={t("orders.stonesTitle")}>
                {renderKeyValueRows(locale, t, order.stones, notProvided)}
              </AdminCard>
            </AdminPrivacyGuard>

            <AdminPrivacyGuard
              fallback={renderPrivacyFallbackCard(t("orders.notesTitle"))}
            >
              <AdminCard title={t("orders.notesTitle")}>
                {renderKeyValueRows(locale, t, order.notes, notProvided)}
              </AdminCard>
            </AdminPrivacyGuard>

            <AdminPrivacyGuard
              fallback={renderPrivacyFallbackCard(t("orders.deliveryTitle"))}
            >
              <AdminCard title={t("orders.deliveryTitle")}>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-muted">{t("newOrder.fields.dueDate")}</p>
                    <p className="mt-1 text-foreground">{order.dueDate || notProvided}</p>
                  </div>
                  <div>
                    <p className="text-muted">{copy.attachmentsLabel}</p>
                    <p className="mt-1 text-foreground">
                      {order.attachments.length > 0
                        ? order.attachments.join(", ")
                        : notProvided}
                    </p>
                  </div>
                </div>
              </AdminCard>
            </AdminPrivacyGuard>
          </section>

          {!isEmployeeView ? (
            <AdminPrivacyGuard fallback={renderPrivacyFallbackCard(copy.supportTicketsTitle)}>
              <AdminCard title={copy.supportTicketsTitle}>
                {order.supportTickets.length === 0 ? (
                  <p className="text-sm text-muted">{copy.noSupportTickets}</p>
                ) : (
                  <div className="space-y-4">
                    {order.supportTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{ticket.subject}</p>
                            <p className="text-xs text-muted">
                              {ticket.customerName || ticket.customerEmail || notProvided}
                            </p>
                          </div>
                          <AdminBadge variant="info">{ticket.status}</AdminBadge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted">{ticket.message}</p>
                        <p className="mt-3 text-xs text-muted">{ticket.createdAt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </AdminCard>
            </AdminPrivacyGuard>
          ) : null}

          {!isEmployeeView ? (
            <AdminPrivacyGuard fallback={renderPrivacyFallbackCard(copy.emailLogTitle)}>
              <AdminCard title={copy.emailLogTitle}>
                {order.emailLogs.length === 0 ? (
                  <p className="text-sm text-muted">{copy.noEmailLogs}</p>
                ) : (
                  <div className="space-y-4">
                    {order.emailLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{log.subject}</p>
                            <p className="text-xs text-muted">{log.recipientEmail}</p>
                            <p className="mt-2 text-xs text-muted">
                              {t("orders.emailTemplateLabel")}:{" "}
                              {getEmailTemplateLabel(t, log.templateType)}
                              {" | "}
                              {t("orders.publicStageLabel")}:{" "}
                              {log.publicStage
                                ? t(`publicTrackingStage.${log.publicStage}`)
                                : t("orders.notStageSpecific")}
                            </p>
                          </div>
                          <AdminBadge variant={getEmailLogVariant(log.status)}>
                            {t(`emailLogStatus.${log.status}`)}
                          </AdminBadge>
                        </div>
                        <p className="mt-2 text-xs text-muted">{log.sentAt || log.createdAt}</p>
                        {log.errorMessage ? (
                          <p className="mt-3 text-sm text-muted">
                            {getEmailLogErrorMessage(t, log.errorMessage)}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </AdminCard>
            </AdminPrivacyGuard>
          ) : null}
        </div>

        <div className="space-y-6">
          {!isEmployeeView ? (
            <AdminPrivacyGuard
              fallback={renderPrivacyFallbackCard(
                t("orders.customerTitle"),
                t("orders.customerDescription")
              )}
            >
              <AdminCard
                title={t("orders.customerTitle")}
                description={t("orders.customerDescription")}
              >
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-muted">{t("orders.table.customer")}</p>
                    <p className="mt-1 text-foreground">
                      {order.customerName || t("common.noCustomer")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">{t("orders.customerEmailLabel")}</p>
                    <p className="mt-1 text-foreground">{order.customerEmail || notProvided}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t("newOrder.fields.customerPhone")}</p>
                    <p className="mt-1 text-foreground">
                      {order.customerPhone ? (
                        <PhoneInline>{order.customerPhone}</PhoneInline>
                      ) : (
                        notProvided
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">{t("newOrder.fields.customerReference")}</p>
                    <p className="mt-1 text-foreground">{order.customerReference || notProvided}</p>
                  </div>
                  <div>
                    <p className="text-muted">{copy.customerLanguage}</p>
                    <p className="mt-1 text-foreground">
                      {formatDetailValue(locale, "customerLanguage", order.customerLanguage)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">{t("newOrder.fields.workshop")}</p>
                    <p className="mt-1 text-foreground">{order.workshopName || notProvided}</p>
                  </div>
                </div>
              </AdminCard>
            </AdminPrivacyGuard>
          ) : null}

          {isEmployeeView ? (
            <EmployeeTaskCard
              assignmentNote={order.assignmentNote}
              dueDate={order.dueDate}
              initialEmployeeNote={order.employeeNote}
              initialStatus={order.assignmentStatus}
              locale={locale}
              orderId={order.id}
            />
          ) : (
            <OrderTrackingCard
              currentUserRole={access.user.role}
              customerEmail={order.customerEmail}
              emailUpdatesEnabled={order.emailUpdatesEnabled}
              employees={employees}
              initialAssignmentNote={order.assignmentNote}
              initialAssignmentStatus={order.assignmentStatus}
              initialEmployeeId={order.employeeId}
              initialEmployeeNote={order.employeeNote}
              initialEvents={order.trackingEvents}
              initialPublicStage={order.publicTrackingStage}
              initialStatus={order.trackingStatus}
              locale={locale}
              orderId={order.id}
              trackingNumber={order.trackingNumber}
            />
          )}
        </div>
      </section>
    </div>
  );
}
