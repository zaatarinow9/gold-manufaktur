"use client";

import clsx from "clsx";
import { SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { sendMessageAction } from "@/app/[locale]/admin/messages/actions";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { StaffMessage } from "@/lib/db/staffMessages";

import { AdminButton } from "./AdminButton";

type Props = {
  className?: string;
  emptyText: string;
  locale: AppLocale;
  messages: StaffMessage[];
  /** Messages written here are linked to this order. */
  orderId?: string;
  placeholder: string;
  threadKey: string;
};

/** A conversation with a composer underneath. */
export function MessageThread({ className, emptyText, locale, messages, orderId, placeholder, threadKey }: Props) {
  const t = useTranslations("Admin.flow.messages");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<StaffMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  // Optimistic copies disappear once the server copy has arrived.
  const shown = [...messages, ...sent.filter((item) => !messages.some((message) => message.body === item.body && message.isMine))];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [shown.length]);

  const send = () => {
    const text = body.trim();
    if (!text) return;
    setError(null);
    setSent((current) => [
      ...current,
      {
        authorKind: "employee",
        authorName: "",
        body: text,
        createdAt: new Date().toISOString(),
        id: `local-${Date.now()}`,
        isMine: true,
        orderId: orderId ?? null,
        orderNumber: "",
      },
    ]);
    setBody("");
    startTransition(async () => {
      const result = await sendMessageAction(locale, { body: text, key: threadKey, orderId });
      if (!result.ok) {
        setError(result.message);
        setBody(text);
        setSent((current) => current.filter((item) => item.body !== text));
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className={clsx("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2" aria-live="polite">
        {shown.length === 0 ? <p className="py-6 text-center text-sm text-muted">{emptyText}</p> : null}
        {shown.map((message) => (
          <div key={message.id} className={clsx("flex", message.isMine ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[85%] rounded-[0.9rem] px-3.5 py-2.5 text-sm",
                message.isMine ? "rounded-ee-sm bg-gold/[0.14] text-foreground" : "rounded-es-sm border border-white/[0.07] bg-white/[0.04] text-foreground"
              )}
            >
              {!message.isMine ? (
                <p className="mb-0.5 text-xs font-semibold text-gold-soft">
                  {message.authorName} · {t(`roles.${message.authorKind}`)}
                </p>
              ) : null}
              <p dir="auto" className="whitespace-pre-line text-start [overflow-wrap:anywhere]">{message.body}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.7rem] text-text-soft">
                <time dateTime={message.createdAt}>
                  {format.dateTime(new Date(message.createdAt), { dateStyle: "short", timeStyle: "short" })}
                </time>
                {message.orderId && message.orderNumber && !orderId ? (
                  <Link href={`/admin/orders/${message.orderId}`} className="underline decoration-dotted underline-offset-2 hover:text-gold-soft">
                    {t("aboutOrder", { order: message.orderNumber })}
                  </Link>
                ) : null}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error ? (
        <p role="alert" className="px-1 pb-2 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      <form
        className="flex items-end gap-2 border-t border-white/[0.06] pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor={`composer-${threadKey}`}>
          {placeholder}
        </label>
        <textarea
          id={`composer-${threadKey}`}
          className="admin-textarea min-h-[2.75rem] flex-1 resize-none"
          rows={2}
          maxLength={4000}
          placeholder={placeholder}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              send();
            }
          }}
        />
        <AdminButton type="submit" variant="primary" disabled={pending || !body.trim()} aria-label={t("send")}>
          <SendHorizontal className="rtl:-scale-x-100" />
          <span className="hidden sm:inline">{t("send")}</span>
        </AdminButton>
      </form>
    </div>
  );
}
