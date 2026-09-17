"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import clsx from "clsx";

type StaticHeroMediaProps = {
  alt: string;
  fallbackContent?: ReactNode;
  fallbackSrc?: string | null;
  imageClassName?: string;
  priority?: boolean;
  sizes: string;
  src?: string | null;
};

function normalizeUrl(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function StaticHeroMedia({
  ...props
}: StaticHeroMediaProps) {
  const primarySrc = normalizeUrl(props.src);
  const defaultSrc = normalizeUrl(props.fallbackSrc);

  return (
    <StaticHeroMediaImage
      key={`${primarySrc}:${defaultSrc}`}
      {...props}
    />
  );
}

function StaticHeroMediaImage({
  alt,
  fallbackContent,
  fallbackSrc,
  imageClassName,
  priority = false,
  sizes,
  src,
}: StaticHeroMediaProps) {
  const primarySrc = normalizeUrl(src);
  const defaultSrc = normalizeUrl(fallbackSrc);
  const [failedPrimarySrc, setFailedPrimarySrc] = useState("");
  const [failedDefaultSrc, setFailedDefaultSrc] = useState("");
  const primaryIsAvailable = Boolean(primarySrc) && failedPrimarySrc !== primarySrc;
  const defaultIsAvailable =
    Boolean(defaultSrc) && failedDefaultSrc !== defaultSrc;
  const currentSrc = primaryIsAvailable
    ? primarySrc
    : defaultIsAvailable
      ? defaultSrc
      : "";

  if (!currentSrc) {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,201,135,0.2),transparent_42%),linear-gradient(180deg,rgba(25,20,14,0.98),rgba(8,8,8,0.98))]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(196,154,82,0.08),transparent_36%,rgba(255,255,255,0.02)_72%,transparent)]" />
        {fallbackContent}
      </div>
    );
  }

  return (
    <Image
      key={`${primarySrc}:${defaultSrc}:${currentSrc}`}
      src={currentSrc}
      alt={alt}
      fill
      preload={priority}
      className={clsx("object-cover", imageClassName)}
      sizes={sizes}
      onError={() => {
        if (currentSrc === primarySrc) {
          setFailedPrimarySrc(primarySrc);
          return;
        }

        setFailedDefaultSrc(defaultSrc);
      }}
    />
  );
}
