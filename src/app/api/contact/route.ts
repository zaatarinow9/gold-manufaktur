import { publicInquiryRequestSchema } from "@/lib/contact";
import { createCustomerInquiry } from "@/lib/db/inquiries";

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
