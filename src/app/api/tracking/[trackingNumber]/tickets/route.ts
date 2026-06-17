import { ZodError } from "zod";

import {
  createSupportTicketFromTracking,
  supportTicketSchema,
} from "@/lib/db/orders";

type TrackingSupportRouteContext = {
  params: Promise<{ trackingNumber: string }>;
};

export async function POST(
  request: Request,
  context: TrackingSupportRouteContext
) {
  const { trackingNumber } = await context.params;
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
        error:
          error instanceof Error ? error.message : "SUPPORT_TICKET_ERROR",
        success: false,
      },
      { status: 500 }
    );
  }
}
