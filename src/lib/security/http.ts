import "server-only";

type HeadersLike = Pick<Headers, "get">;

function normalizeOrigin(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === "null") {
    return "";
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return "";
  }
}

function getConfiguredOrigins() {
  const configured = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ];

  return new Set(
    configured
      .map((value) => normalizeOrigin(value))
      .filter((value) => value.length > 0)
  );
}

export function getClientIp(headersLike: HeadersLike) {
  const candidates = [
    headersLike.get("x-forwarded-for"),
    headersLike.get("x-real-ip"),
    headersLike.get("cf-connecting-ip"),
    headersLike.get("fly-client-ip"),
    headersLike.get("x-vercel-forwarded-for"),
  ];

  for (const candidate of candidates) {
    const value = candidate?.split(",")[0]?.trim();

    if (value) {
      return value;
    }
  }

  return "unknown";
}

export function getContentLength(headersLike: HeadersLike) {
  const value = headersLike.get("content-length")?.trim();

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function hasTrustedOrigin(
  request: Request,
  options?: { allowMissing?: boolean }
) {
  const origin = normalizeOrigin(request.headers.get("origin"));

  if (!origin) {
    return options?.allowMissing === true;
  }

  const trustedOrigins = getConfiguredOrigins();
  trustedOrigins.add(new URL(request.url).origin);

  return trustedOrigins.has(origin);
}
