export const STATIC_SITE_IMAGE_BUCKET = "site-images";
export const STATIC_SITE_IMAGE_ALLOWED_MIME_TYPES = [
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const STATIC_SITE_IMAGE_INPUT_ACCEPT = ".avif,.jpg,.jpeg,.png,.webp";
export const STATIC_SITE_IMAGE_FILE_SIZE_LIMIT = "5MB";
export const STATIC_SITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type StaticSiteImageRecord = {
  publicUrl: string;
  storagePath: string;
  updatedAt: string;
};

export type StaticSiteImageSlot =
  | "homepageHero"
  | "promoPopupImage"
  | "shopHero";

export const STATIC_SITE_IMAGE_SLOTS = [
  "homepageHero",
  "shopHero",
  "promoPopupImage",
] as const satisfies readonly StaticSiteImageSlot[];

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isStaticSiteImageSlot(value: string): value is StaticSiteImageSlot {
  return STATIC_SITE_IMAGE_SLOTS.includes(value as StaticSiteImageSlot);
}

export function isAllowedStaticSiteImageMimeType(
  value: string
): value is (typeof STATIC_SITE_IMAGE_ALLOWED_MIME_TYPES)[number] {
  return STATIC_SITE_IMAGE_ALLOWED_MIME_TYPES.includes(
    value as (typeof STATIC_SITE_IMAGE_ALLOWED_MIME_TYPES)[number]
  );
}

export function getStaticSiteImageExtension(mimeType: string) {
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

export function buildStaticSiteImageObjectPath(input: {
  fileName: string;
  mimeType: string;
  slot: StaticSiteImageSlot;
}) {
  const folder = sanitizeSegment(input.slot) || "site";
  const baseName =
    sanitizeSegment(input.fileName.replace(/\.[^.]+$/u, "")) || "site-image";
  const token = globalThis.crypto.randomUUID();
  const extension = getStaticSiteImageExtension(input.mimeType);

  return `static/${folder}/${token}-${baseName}.${extension}`;
}

export function extractStaticSiteImageObjectPath(
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
      `/storage/v1/object/public/${STATIC_SITE_IMAGE_BUCKET}/`,
      `/storage/v1/render/image/public/${STATIC_SITE_IMAGE_BUCKET}/`,
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
