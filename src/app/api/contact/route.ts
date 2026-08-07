import { publicInquiryRequestSchema } from "@/lib/contact";
import { isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import { createCustomerInquiry } from "@/lib/db/inquiries";
import {
  getClientIp,
  getContentLength,
  hasTrustedOrigin,
} from "@/lib/security/http";
import { consumeRateLimit } from "@/lib/security/rateLimit";

const CONTACT_REQUEST_MAX_BYTES = 32 * 1024;

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request, { allowMissing: true })) {
    return Response.json({ error: "FORBIDDEN", success: false }, { status: 403 });
  }

  const contentLength = getContentLength(request.headers);

  if (contentLength !== null && contentLength > CONTACT_REQUEST_MAX_BYTES) {
    return Response.json(
      { error: "PAYLOAD_TOO_LARGE", success: false },
      { status: 413 }
    );
  }

  if (await isAdminDecoyEnabled()) {
    return Response.json(
      { error: "REQUEST_UNAVAILABLE", success: false },
      { status: 503 }
    );
  }

  const rateLimit = consumeRateLimit({
    key: `contact:${getClientIp(request.headers)}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return Response.json(
      { error: "RATE_LIMITED", success: false },
      {
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
        status: 429,
      }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "INVALID_JSON", success: false },
      { status: 400 }
    );
  }

  const result = publicInquiryRequestSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: "INVALID_INPUT",
        fieldErrors: result.error.flatten().fieldErrors,
        success: false,
      },
      { status: 400 }
    );
  }

  const inquiryResult = await createCustomerInquiry({
    customerEmail: result.data.email,
    customerName: result.data.name,
    customerPhone: result.data.phone,
    locale: result.data.locale,
    message: result.data.message,
    optionValues: result.data.optionValues,
    productSnapshot: result.data.productSnapshot,
    source:
      result.data.source === "product" && result.data.productSnapshot
        ? "product"
        : "contact",
  });

  return Response.json({
    delivered: inquiryResult.emailResult.delivered,
    fallback: inquiryResult.emailResult.fallback,
    success: true,
  });
}
