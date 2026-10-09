"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { usePathname } from "@/i18n/navigation";

const MAX_PENDING_MS = 15_000;

/**
 * App Router intentionally has no route-change events.  A capturing click
 * listener starts feedback for real internal links, while pathname commits and
 * browser history events finish it. This keeps the indicator independent of
 * router internals and works for next-intl links too.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const t = useTranslations("Admin.loading");
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setActive(false);
  };

  const start = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActive(true);
    // Failed navigations have no App Router completion signal. This is only a
    // recovery guard, never the normal completion mechanism.
    timeoutRef.current = setTimeout(finish, MAX_PENDING_MS);
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.hash || destination.href === window.location.href) return;
      start();
    };
    const onPopState = () => start();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  });

  useEffect(() => {
    // Schedule after the committed route render; this also prevents an initial
    // render from producing a visible flash.
    const frame = requestAnimationFrame(finish);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div className="navigation-progress" data-active={active} aria-live="polite" aria-atomic="true">
      <span className="sr-only">{active ? t("loading") : ""}</span>
      <span className="navigation-progress-bar" aria-hidden="true" />
    </div>
  );
}
