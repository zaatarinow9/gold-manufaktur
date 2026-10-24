"use client";

import clsx from "clsx";
import { Archive, CheckCheck, Mail, MessageSquareReply, Phone, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import {
  deleteInquiryAction,
  updateInquiryStatusAction,
} from "@/app/[locale]/admin/inquiries/actions";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTabs } from "@/components/admin/AdminTabs";
import type { AppLocale } from "@/i18n/routing";
import type { CustomerInquiryRecord, CustomerInquiryStatus } from "@/lib/db/inquiries";
import { localeLabels } from "@/lib/site";

type AdminInquiriesClientProps = {
  inquiries: CustomerInquiryRecord[];
  locale: AppLocale;
};

const statusOrder: CustomerInquiryStatus[] = ["new", "read", "in_progress", "replied", "archived"];

const statusVariant: Record<CustomerInquiryStatus, "gold" | "info" | "neutral" | "success" | "warning"> = {
  archived: "neutral",
  in_progress: "warning",
  new: "gold",
  read: "info",
  replied: "success",
};

function isAppLocale(value: string): value is AppLocale {
  return value in localeLabels;
}

export function AdminInquiriesClient({ inquiries, locale }: AdminInquiriesClientProps) {
  const t = useTranslations("Admin.inquiriesPage");
  const tc = useTranslations("Admin");
  const format = useFormatter();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"open" | "all" | CustomerInquiryStatus>("open");

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: inquiries.length, open: 0 };
    for (const inquiry of inquiries) {
      result[inquiry.status] = (result[inquiry.status] ?? 0) + 1;
      if (inquiry.status !== "archived" && inquiry.status !== "replied") result.open += 1;
    }
    return result;
  }, [inquiries]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...inquiries]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .filter((inquiry) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "open"
            ? inquiry.status !== "archived" && inquiry.status !== "replied"
            : inquiry.status === statusFilter);
        const haystack = [
          inquiry.customerName,
          inquiry.customerEmail,
          inquiry.customerPhone,
          inquiry.message,
          inquiry.productSnapshot?.name ?? "",
          inquiry.productSnapshot?.sku ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return matchesStatus && (!query || haystack.includes(query));
      });
  }, [inquiries, search, statusFilter]);

  const run = (task: () => Promise<{ message: string; ok: boolean }>) => {
    startTransition(async () => {
      const result = await task();
      setFeedback({ message: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("title")} description={t("description")} />

      {feedback ? (
        <div className="admin-notice" data-tone={feedback.tone} role="status">
          {feedback.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block lg:w-80">
          <span className="sr-only">{tc("common.search")}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="admin-input admin-input-with-icon"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <AdminTabs
          className="lg:ms-auto"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as typeof statusFilter)}
          tabs={[
            { id: "open", label: t("filters.open"), count: counts.open },
            ...statusOrder.map((status) => ({
              id: status,
              label: t(`statuses.${status}`),
              count: counts[status] ?? 0,
            })),
            { id: "all", label: t("filters.all"), count: counts.all },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState
          title={inquiries.length === 0 ? t("emptyTitle") : t("emptyFilteredTitle")}
          description={inquiries.length === 0 ? t("emptyText") : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((inquiry) => {
            const isUnread = inquiry.status === "new";
            const languageLabel = isAppLocale(inquiry.locale) ? localeLabels[inquiry.locale] : inquiry.locale;

            return (
              <li
                key={inquiry.id}
                className={clsx("admin-panel p-4", isUnread && "border-gold/30")}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isUnread ? <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" /> : null}
                      <p className="font-semibold text-foreground">
                        {inquiry.customerName || inquiry.customerEmail || t("unknownCustomer")}
                      </p>
                      <AdminBadge variant={statusVariant[inquiry.status]}>{t(`statuses.${inquiry.status}`)}</AdminBadge>
                      <AdminBadge>{t(`sources.${inquiry.source}`)}</AdminBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {format.dateTime(new Date(inquiry.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                      {languageLabel ? ` · ${t("writtenIn", { language: languageLabel })}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="sr-only" htmlFor={`status-${inquiry.id}`}>{t("status")}</label>
                    <select
                      id={`status-${inquiry.id}`}
                      className="admin-select !min-h-9 !py-1.5 text-sm"
                      value={inquiry.status}
                      disabled={isPending}
                      onChange={(event) =>
                        run(() =>
                          updateInquiryStatusAction(locale, inquiry.id, event.target.value as CustomerInquiryStatus)
                        )
                      }
                    >
                      {statusOrder.map((status) => (
                        <option key={status} value={status}>{t(`statuses.${status}`)}</option>
                      ))}
                    </select>
                    <AdminActionMenu
                      label={tc("productsPage.moreActions", { name: inquiry.customerName || inquiry.customerEmail })}
                      items={[
                        ...(isUnread
                          ? [
                              {
                                icon: Mail,
                                label: t("markRead"),
                                onSelect: () => run(() => updateInquiryStatusAction(locale, inquiry.id, "read")),
                              },
                            ]
                          : []),
                        {
                          icon: CheckCheck,
                          label: t("markReplied"),
                          onSelect: () => run(() => updateInquiryStatusAction(locale, inquiry.id, "replied")),
                        },
                        {
                          icon: Archive,
                          label: t("archive"),
                          onSelect: () => run(() => updateInquiryStatusAction(locale, inquiry.id, "archived")),
                        },
                        {
                          danger: true,
                          icon: Trash2,
                          label: t("delete"),
                          onSelect: () => {
                            if (window.confirm(t("deleteConfirm"))) {
                              run(() => deleteInquiryAction(locale, inquiry.id));
                            }
                          },
                        },
                      ]}
                    />
                  </div>
                </div>

                {inquiry.productSnapshot?.name ? (
                  <p className="mt-3 text-sm text-foreground">
                    <span className="text-muted">{t("product")}: </span>
                    {inquiry.productSnapshot.name}
                    {inquiry.productSnapshot.sku ? (
                      <span className="text-muted"> (<bdi>{inquiry.productSnapshot.sku}</bdi>)</span>
                    ) : null}
                  </p>
                ) : null}

                {inquiry.message ? (
                  <p className="mt-3 whitespace-pre-line rounded-[0.625rem] bg-white/[0.03] px-3.5 py-3 text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
                    {inquiry.message}
                  </p>
                ) : null}

                {inquiry.optionValues.length > 0 ? (
                  <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                    {inquiry.optionValues.map((option) => (
                      <div key={`${inquiry.id}-${option.key}`} className="flex gap-2">
                        <dt className="text-muted">{option.label}:</dt>
                        <dd className="text-foreground">
                          {Array.isArray(option.value) ? option.value.join(", ") : String(option.value ?? "")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {inquiry.customerEmail ? (
                    <a href={`mailto:${inquiry.customerEmail}`} className="admin-button admin-button-secondary admin-button-sm">
                      <Mail />
                      <bdi>{inquiry.customerEmail}</bdi>
                    </a>
                  ) : null}
                  {inquiry.customerPhone ? (
                    <a href={`tel:${inquiry.customerPhone.replace(/\s+/g, "")}`} className="admin-button admin-button-secondary admin-button-sm">
                      <Phone />
                      <bdi>{inquiry.customerPhone}</bdi>
                    </a>
                  ) : null}
                  {inquiry.customerPhone ? (
                    <a
                      href={`https://wa.me/${inquiry.customerPhone.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-button admin-button-ghost admin-button-sm"
                    >
                      <MessageSquareReply />
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
