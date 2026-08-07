import { ZodError } from "zod";

import { trackingNumberPattern } from "@/lib/admin/tracking";
import { isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import {
  createSupportTicketFromTracking,
  supportTicketSchema,
} from "@/lib/db/orders";
import {
  getClientIp,
  getContentLength,
  hasTrustedOrigin,
} from "@/lib/security/http";
import { consumeRateLimit } from "@/lib/security/rateLimit";

type TrackingSupportRouteContext = {
  params: Promise<{ trackingNumber: string }>;
};

export async function POST(
  request: Request,
  context: TrackingSupportRouteContext
) {
  const { trackingNumber } = await context.params;

  if (!trackingNumberPattern.test(trackingNumber)) {
    return Response.json(
      { error: "INVALID_INPUT", success: false },
      { status: 400 }
    );
  }

  if (!hasTrustedOrigin(request, { allowMissing: true })) {
    return Response.json({ error: "FORBIDDEN", success: false }, { status: 403 });
  }

  const contentLength = getContentLength(request.headers);

  if (contentLength !== null && contentLength > 32 * 1024) {
    return Response.json(
      { error: "PAYLOAD_TOO_LARGE", success: false },
      { status: 413 }
    );
  }

  if (await isAdminDecoyEnabled()) {
    return Response.json(
      { error: "SUPPORT_TICKET_ERROR", success: false },
      { status: 503 }
    );
  }

  const rateLimit = consumeRateLimit({
    key: `tracking-ticket:${getClientIp(request.headers)}:${trackingNumber}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
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

  const result = supportTicketSchema.safeParse(body);

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

  try {
    const created = await createSupportTicketFromTracking(
      trackingNumber,
      result.data
    );

    return Response.json({
      orderId: created.orderId,
      success: true,
      ticketId: created.ticketId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: "INVALID_INPUT",
          fieldErrors: error.flatten().fieldErrors,
          success: false,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: "SUPPORT_TICKET_ERROR",
        success: false,
      },
      { status: 500 }
    );
  }
}
