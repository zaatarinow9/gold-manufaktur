import { contactInquirySchema } from "@/lib/contact";
import { sendTransactionalEmail } from "@/lib/email/service";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "INVALID_JSON", success: false },
      { status: 400 }
    );
  }

  const result = contactInquirySchema.safeParse(body);

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

  const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL?.trim() ?? "";

  if (!receiverEmail) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[contact] Inquiry captured without email provider:", result.data);
    } else {
      console.warn(
        "[contact] Contact inquiry accepted, but CONTACT_RECEIVER_EMAIL is missing."
      );
    }

    return Response.json({ success: true });
  }

  const dispatchResult = await sendTransactionalEmail({
    metadata: {
      email: result.data.email,
      kind: "contact_inquiry",
      name: result.data.name,
      phone: result.data.phone,
    },
    recipientEmail: receiverEmail,
    replyTo: result.data.email,
    subject: `Contact inquiry from ${result.data.name}`,
    text: [
      "A new contact inquiry was submitted.",
      "",
      `Name: ${result.data.name}`,
      `Email: ${result.data.email}`,
      `Phone: ${result.data.phone}`,
      "",
      result.data.message,
    ].join("\n"),
  });

  if (!dispatchResult.ok && !dispatchResult.fallback) {
    console.warn(
      `[contact] Contact inquiry email could not be delivered: ${
        dispatchResult.reason ?? "unknown_error"
      }`
    );
  }

  return Response.json({
    delivered: dispatchResult.delivered,
    fallback: dispatchResult.fallback,
    success: true,
  });
}
