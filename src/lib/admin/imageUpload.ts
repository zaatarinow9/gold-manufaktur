"use client";

import {
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_UPLOAD_QUALITY,
} from "@/lib/product-images";

export type CatalogImageUploadError =
  | "invalid_type"
  | "too_large"
  | "upload_failed";

export class CatalogImageUploadFailure extends Error {
  constructor(public readonly code: CatalogImageUploadError) {
    super(code);
  }
}

export function isAllowedCatalogImage(file: File) {
  return PRODUCT_IMAGE_ALLOWED_MIME_TYPES.includes(
    file.type as (typeof PRODUCT_IMAGE_ALLOWED_MIME_TYPES)[number]
  );
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = src;
  });
}

/** Downscales to PRODUCT_IMAGE_MAX_DIMENSION and re-encodes as WebP. */
export async function compressCatalogImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const scale = Math.min(1, PRODUCT_IMAGE_MAX_DIMENSION / Math.max(width, height));
    const canvas = document.createElement("canvas");

    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("CANVAS_UNAVAILABLE");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("COMPRESSION_FAILED"))),
        "image/webp",
        PRODUCT_IMAGE_UPLOAD_QUALITY
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/u, "") || "image";
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Compresses and uploads one image to the catalog bucket.
 * `folder` groups files in storage (e.g. the product slug or "categories").
 */
export async function uploadCatalogImage(file: File, folder: string) {
  if (!isAllowedCatalogImage(file)) {
    throw new CatalogImageUploadFailure("invalid_type");
  }

  let compressed: File;

  try {
    compressed = await compressCatalogImage(file);
  } catch {
    throw new CatalogImageUploadFailure("upload_failed");
  }

  const body = new FormData();
  body.set("file", compressed);
  body.set("productSlug", folder);

  const response = await fetch("/api/admin/product-images", {
    body,
    method: "POST",
  }).catch(() => null);
  const payload = (await response?.json().catch(() => null)) as
    | { error?: string; success?: boolean; url?: string }
    | null;

  if (!response?.ok || !payload?.success || !payload.url) {
    throw new CatalogImageUploadFailure(
      payload?.error === "FILE_TOO_LARGE"
        ? "too_large"
        : payload?.error === "INVALID_FILE_TYPE"
          ? "invalid_type"
          : "upload_failed"
    );
  }

  return payload.url;
}
