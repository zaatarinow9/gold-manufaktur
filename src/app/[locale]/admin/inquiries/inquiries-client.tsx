"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import {
  deleteInquiryAction,
  updateInquiryStatusAction,
} from "@/app/[locale]/admin/inquiries/actions";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import type {
  CustomerInquiryRecord,
  CustomerInquiryStatus,
} from "@/lib/db/inquiries";
import type { AppLocale } from "@/i18n/routing";

type AdminInquiriesClientProps = {
  inquiries: CustomerInquiryRecord[];
  locale: AppLocale;
};

function getInquiriesUiCopy(locale: AppLocale) {
  if (locale === "ar") {
    return {
      archive: "أرشفة",
      delete: "حذف",
      description:
        "جميع طلبات التواصل وطلبات المنتجات تظهر هنا مع حالة واضحة وسجل واحد للفريق.",
      email: "البريد الإلكتروني",
      filtersDescription: "ابحث بالاسم أو البريد أو الهاتف أو المنتج أو الرسالة.",
      product: "المنتج",
      read: "تمت القراءة",
      replied: "تم الرد",
      source: "المصدر",
      status: "الحالة",
      title: "طلبات العملاء",
    };
  }

  if (locale === "de") {
    return {
      archive: "Archivieren",
      delete: "Loeschen",
      description:
        "Hier laufen allgemeine Kontaktanfragen und produktspezifische Kundenanfragen zentral zusammen.",
      email: "E-Mail",
      filtersDescription:
        "Suchen Sie nach Name, E-Mail, Telefon, Produkt oder Nachricht.",
      product: "Produkt",
      read: "Gelesen",
      replied: "Beantwortet",
      source: "Quelle",
      status: "Status",
      title: "Kundenanfragen",
    };
  }

  return {
    archive: "Archive",
    delete: "Delete",
    description:
      "General contact messages and product-specific requests are collected here for the admin team.",
    email: "Email",
    filtersDescription: "Search by name, email, phone, product, or message.",
    product: "Product",
    read: "Read",
    replied: "Replied",
    source: "Source",
    status: "Status",
    title: "Customer inquiries",
  };
}

function getStatusBadgeVariant(status: CustomerInquiryStatus) {
  if (status === "new") {
    return "gold";
  }

  if (status === "archived") {
    return "neutral";
  }

  if (status === "replied") {
    return "success";
  }

  return "info";
}

export function AdminInquiriesClient({
  inquiries,
  locale,
}: AdminInquiriesClientProps) {
  const copy = getInquiriesUiCopy(locale);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const filteredInquiries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return inquiries.filter((inquiry) => {
      const matchesStatus =
        statusFilter === "all" || inquiry.status === statusFilter;
      const matchesSource =
        sourceFilter === "all" || inquiry.source === sourceFilter;
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

      return (
        matchesStatus &&
        matchesSource &&
        (normalizedSearch.length === 0 || haystack.includes(normalizedSearch))
      );
    });
  }, [inquiries, search, sourceFilter, statusFilter]);

  const setStatus = (inquiryId: string, status: CustomerInquiryStatus) => {
    startTransition(async () => {
      const result = await updateInquiryStatusAction(locale, inquiryId, status);
      setFeedback(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  };

  const removeInquiry = (inquiryId: string) => {
    startTransition(async () => {
      const result = await deleteInquiryAction(locale, inquiryId);
      setFeedback(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={copy.title}
        title={copy.title}
        description={copy.description}
      />

      {feedback ? (
        <div className="rounded-[1rem] border border-gold/18 bg-gold/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      <AdminCard title={copy.status} description={copy.filtersDescription}>
        <AdminToolbar>
          <AdminInput
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.filtersDescription}
            icon={<Search className="h-4 w-4" />}
          />
          <AdminSelect
            label={copy.status}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="new">new</option>
            <option value="read">read</option>
            <option value="in_progress">in_progress</option>
            <option value="replied">replied</option>
            <option value="archived">archived</option>
          </AdminSelect>
          <AdminSelect
            label={copy.source}
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="contact">contact</option>
            <option value="product">product</option>
            <option value="order_entry">order_entry</option>
          </AdminSelect>
        </AdminToolbar>
      </AdminCard>

      <div className="grid gap-4">
        {filteredInquiries.map((inquiry) => (
          <AdminCard
            key={inquiry.id}
            title={inquiry.customerName || inquiry.customerEmail}
            description={inquiry.productSnapshot?.name || inquiry.message}
            action={
              <div className="flex flex-wrap gap-2">
                <AdminBadge variant={getStatusBadgeVariant(inquiry.status)}>
                  {inquiry.status}
                </AdminBadge>
                <AdminBadge variant="neutral">{inquiry.source}</AdminBadge>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2 text-sm text-muted">
                  <p>{`${copy.email}: ${inquiry.customerEmail || "-"}`}</p>
                  <p>{`Phone: ${inquiry.customerPhone || "-"}`}</p>
                  <p>{`${copy.product}: ${inquiry.productSnapshot?.name || "-"}`}</p>
                </div>
                <div className="space-y-2 text-sm text-muted">
                  <p>{`Created: ${inquiry.createdAt.slice(0, 16).replace("T", " ")}`}</p>
                  <p>{`Locale: ${inquiry.locale}`}</p>
                </div>
              </div>

              <div className="rounded-[1rem] border border-white/8 bg-white/4 px-4 py-4 text-sm text-foreground">
                {inquiry.message}
              </div>

              {inquiry.optionValues.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {inquiry.optionValues.map((option) => (
                    <AdminBadge key={`${inquiry.id}-${option.key}`} variant="info">
                      {`${option.label}: ${
                        Array.isArray(option.value)
                          ? option.value.join(", ")
                          : String(option.value ?? "")
                      }`}
                    </AdminBadge>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <AdminButton
                  size="sm"
                  variant="secondary"
                  onClick={() => setStatus(inquiry.id, "read")}
                  disabled={isPending}
                >
                  {copy.read}
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatus(inquiry.id, "in_progress")}
                  disabled={isPending}
                >
                  in_progress
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatus(inquiry.id, "replied")}
                  disabled={isPending}
                >
                  {copy.replied}
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatus(inquiry.id, "archived")}
                  disabled={isPending}
                >
                  {copy.archive}
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="danger"
                  onClick={() => removeInquiry(inquiry.id)}
                  disabled={isPending}
                >
                  {copy.delete}
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
