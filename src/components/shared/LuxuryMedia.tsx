import type { ReactNode } from "react";
import Image from "next/image";
import clsx from "clsx";

type LuxuryMediaProps = {
  alt: string;
  fallbackClassName?: string;
  fallbackContent?: ReactNode;
  imageClassName?: string;
  priority?: boolean;
  sizes: string;
  src?: string | null;
};

export function LuxuryMedia({
  alt,
  fallbackClassName,
  fallbackContent,
  imageClassName,
  priority = false,
  sizes,
  src,
}: LuxuryMediaProps) {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";

  if (normalizedSrc) {
    return (
      <Image
        src={normalizedSrc}
        alt={alt}
        fill
        priority={priority}
        className={clsx("object-cover", imageClassName)}
        sizes={sizes}
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
