"use client";

import { useCallback, useLayoutEffect, useState, type RefObject } from "react";

type Placement = { left: number; maxHeight: number; minWidth: number; top: number };

/**
 * Positions a popover (menu, date picker…) next to its trigger with
 * `position: fixed`, so it is never clipped by a card, table or scrolling
 * area. It opens downwards and flips up when there is no room below, keeps
 * inside the viewport, and aligns to the trigger's inline end (RTL aware).
 */
export function useFloating(
  triggerRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  open: boolean,
  align: "end" | "start" = "end"
) {
  const [placement, setPlacement] = useState<Placement | null>(null);

  const update = useCallback(() => {
    const trigger = triggerRef.current;
    const floating = floatingRef.current;
    if (!trigger || !floating) return;
    const gap = 6;
    const margin = 8;
    const rect = trigger.getBoundingClientRect();
    const width = floating.offsetWidth;
    const height = floating.scrollHeight;
    const rtl = getComputedStyle(trigger).direction === "rtl";
    const alignRight = (align === "end") !== rtl;

    let left = alignRight ? rect.right - width : rect.left;
    left = Math.min(Math.max(margin, left), window.innerWidth - width - margin);

    const below = window.innerHeight - rect.bottom - gap - margin;
    const above = rect.top - gap - margin;
    const openUp = height > below && above > below;
    const maxHeight = Math.max(160, openUp ? above : below);
    const top = openUp ? Math.max(margin, rect.top - gap - Math.min(height, maxHeight)) : rect.bottom + gap;

    setPlacement({ left, maxHeight, minWidth: rect.width, top });
  }, [align, floatingRef, triggerRef]);

  useLayoutEffect(() => {
    if (!open) return;
    // Measure once the floating element has been mounted.
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      setPlacement(null);
    };
  }, [open, update]);

  return {
    style: placement
      ? ({ left: placement.left, maxHeight: placement.maxHeight, position: "fixed", top: placement.top } as const)
      : ({ left: -9999, position: "fixed", top: -9999, visibility: "hidden" } as const),
    update,
  };
}

/** Where to mount popovers: inside the dashboard shell so its colours apply. */
export function getPopoverRoot(from: HTMLElement | null) {
  if (typeof document === "undefined") return null;
  return (from?.closest(".admin-shell") as HTMLElement | null) ?? document.body;
}
