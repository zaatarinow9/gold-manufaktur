import { adminOrders } from "@/data/adminMock";
import { orderNotificationSchema } from "@/lib/admin/tracking";

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/orders/[id]/notify">
) {
  const { id } = await context.params;
  const order = adminOrders.find((entry) => entry.id === id);

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

  if (process.env.NODE_ENV !== "production") {
    console.info("[admin-order-notify] Mock notification payload:", result.data);
  }

  // Later integrate Resend/SMTP here.
  // CONTACT_RECEIVER_EMAIL and provider env vars can be added here when email delivery is enabled.

  return Response.json({ success: true });
}
