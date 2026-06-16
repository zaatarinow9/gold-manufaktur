import { contactInquirySchema } from "@/lib/contact";

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

  const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL;
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  const hasSmtp = Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

  if (!receiverEmail || (!hasResend && !hasSmtp)) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[contact] Inquiry captured without email provider:", result.data);
    } else {
      console.warn(
        "[contact] Contact inquiry accepted, but CONTACT_RECEIVER_EMAIL or provider credentials are missing."
      );
    }

    return Response.json({ success: true });
  }

  // Future Resend/SMTP integration belongs here.
  // Example:
  // await sendInquiryEmail({ to: receiverEmail, ...result.data });
  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[contact] CONTACT_RECEIVER_EMAIL is configured for ${receiverEmail}, but email delivery is still a placeholder.`
    );
  }

  return Response.json({ success: true });
}
