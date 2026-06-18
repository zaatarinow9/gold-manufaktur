export const PRODUCT_IMAGE_BUCKET = "product-images";
export const PRODUCT_IMAGE_ALLOWED_MIME_TYPES = [
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const PRODUCT_IMAGE_FILE_SIZE_LIMIT = "6MB";
export const PRODUCT_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_DIMENSION = 1800;
export const PRODUCT_IMAGE_UPLOAD_QUALITY = 0.84;

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function getProductImageExtension(mimeType: string) {
  switch (mimeType) {
    case "image/avif":
      return "avif";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    default:
      return "webp";
  }
}

export function buildProductImageObjectPath(input: {
  fileName: string;
  mimeType: string;
  productSku?: string;
  productSlug?: string;
}) {
  const folder =
    sanitizeSegment(input.productSlug ?? "") ||
    sanitizeSegment(input.productSku ?? "") ||
    "catalog";
  const baseName =
    sanitizeSegment(input.fileName.replace(/\.[^.]+$/u, "")) || "product-image";
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const extension = getProductImageExtension(input.mimeType);

  return `products/${folder}/${token}-${baseName}.${extension}`;
}

export function extractProductImageObjectPath(
  value: string,
  supabaseUrl: string
) {
  try {
    const publicUrl = new URL(value);
    const projectUrl = new URL(supabaseUrl);

    if (publicUrl.origin !== projectUrl.origin) {
      return null;
    }

    const publicPrefixes = [
      `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`,
      `/storage/v1/render/image/public/${PRODUCT_IMAGE_BUCKET}/`,
    ];

    const prefix = publicPrefixes.find((candidate) =>
      publicUrl.pathname.startsWith(candidate)
    );

    if (!prefix) {
      return null;
    }

    return decodeURIComponent(publicUrl.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}
