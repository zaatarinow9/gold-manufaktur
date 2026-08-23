"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import clsx from "clsx";

type LuxuryMediaProps = {
  alt: string;
  fallbackClassName?: string;
  fallbackContent?: ReactNode;
  fallbackSrc?: string | null;
  imageClassName?: string;
  priority?: boolean;
  sizes: string;
  src?: string | null;
};

export function LuxuryMedia({
  alt,
  fallbackClassName,
  fallbackContent,
  fallbackSrc,
  imageClassName,
  priority = false,
  sizes,
  src,
}: LuxuryMediaProps) {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const normalizedFallbackSrc =
    typeof fallbackSrc === "string" ? fallbackSrc.trim() : "";
  const [failedSrc, setFailedSrc] = useState("");
  const currentSrc =
    failedSrc === normalizedSrc
      ? normalizedFallbackSrc !== normalizedSrc
        ? normalizedFallbackSrc
        : ""
      : failedSrc === normalizedFallbackSrc
        ? ""
        : normalizedSrc || normalizedFallbackSrc;

  if (currentSrc) {
    return (
      <Image
        src={currentSrc}
        alt={alt}
        fill
        preload={priority}
        className={clsx("object-cover", imageClassName)}
        sizes={sizes}
        onError={() => {
          setFailedSrc(currentSrc);
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,201,135,0.2),transparent_42%),linear-gradient(180deg,rgba(25,20,14,0.98),rgba(8,8,8,0.98))]",
        fallbackClassName
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(196,154,82,0.08),transparent_36%,rgba(255,255,255,0.02)_72%,transparent)]" />
      {fallbackContent}
    </div>
  );
}
