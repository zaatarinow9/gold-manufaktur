import { getAdminSessionContext } from "@/lib/admin/auth";
import { orderNotificationSchema } from "@/lib/admin/tracking";
import { getScopedOrderDetail } from "@/lib/db/orders";
import { sendTransactionalEmail } from "@/lib/email/service";

type AdminOrderNotifyRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: AdminOrderNotifyRouteContext
) {
  const { id } = await context.params;
  const session = await getAdminSessionContext();

  if (session.state === "anonymous") {
    return Response.json({ error: "UNAUTHORIZED", success: false }, { status: 401 });
  }

  if (session.state !== "authenticated" || !session.user) {
    return Response.json({ error: "FORBIDDEN", success: false }, { status: 403 });
  }

  const order = await getScopedOrderDetail(session.user, id);

  if (!order) {
    return Response.json({ error: "ORDER_NOT_FOUND", success: false }, { status: 404 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON", success: false }, { status: 400 });
  }

  const result = orderNotificationSchema.safeParse(body);

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

  if (result.data.orderId !== id || result.data.trackingNumber !== order.trackingNumber) {
    return Response.json({ error: "MISMATCHED_ORDER", success: false }, { status: 400 });
  }

  if (order.customerEmail && result.data.customerEmail !== order.customerEmail) {
    return Response.json({ error: "MISMATCHED_CUSTOMER", success: false }, { status: 400 });
  }

  const dispatchResult = await sendTransactionalEmail({
    metadata: {
      kind: "manual_order_notification",
      trackingNumber: order.trackingNumber,
      trackingStatus: result.data.trackingStatus,
    },
    orderId: order.id,
    recipientEmail: result.data.customerEmail,
    replyTo: process.env.CONTACT_RECEIVER_EMAIL?.trim() || undefined,
    subject: `Update for order ${order.trackingNumber}`,
    text: [
      `Hello${order.customerName ? ` ${order.customerName}` : ""},`,
      "",
      result.data.message,
      "",
      `Tracking status: ${result.data.trackingStatus}`,
      `Tracking link: ${result.data.trackingLink}`,
    ].join("\n"),
  });

  if (!dispatchResult.ok && !dispatchResult.fallback) {
    return Response.json(
      {
        error: "EMAIL_DELIVERY_FAILED",
        success: false,
      },
      { status: 502 }
    );
  }

  return Response.json({
    delivered: dispatchResult.delivered,
    fallback: dispatchResult.fallback,
    status: dispatchResult.status,
    success: true,
  });
}
