import { createOrder } from "@/lib/db/orders";
import { getPublicProductByIdOrSlug } from "@/lib/db/catalog";
import { validateOrderEntryToken } from "@/lib/db/siteSettings";
import { publicOrderEntryRequestSchema } from "@/lib/orderEntry";
import type { AppLocale } from "@/i18n/routing";
import type { CatalogProductOptionField } from "@/types/catalog";

const supportedLocales = new Set<AppLocale>(["de", "ar", "en", "fr", "tr"]);

type OptionFieldValue = boolean | number | string | string[] | null;

function normalizeLocale(value: string): AppLocale {
  return supportedLocales.has(value as AppLocale) ? (value as AppLocale) : "de";
}

function isMissingRequiredValue(type: string, value: OptionFieldValue | undefined) {
  if (type === "boolean") {
    return value !== true;
  }

  if (type === "multi_select") {
    return !Array.isArray(value) || value.length === 0;
  }

  if (type === "number") {
    return typeof value !== "number" || !Number.isFinite(value);
  }

  return typeof value !== "string" || value.trim().length === 0;
}

function normalizeFieldValue(type: string, value: OptionFieldValue) {
  if (type === "boolean") {
    return value === true;
  }

  if (type === "multi_select") {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  }

  if (type === "number") {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function isValidFieldValue(
  field: CatalogProductOptionField,
  value: OptionFieldValue
) {
  if (value === null) {
    return !field.isRequired;
  }

  if (field.type === "select") {
    return (
      typeof value === "string" &&
      (value.length === 0
        ? !field.isRequired
        : field.values.some((option) => option.value === value))
    );
  }

  if (field.type === "multi_select") {
    return (
      Array.isArray(value) &&
      value.every((item) =>
        field.values.some((option) => option.value === item)
      )
    );
  }

  if (field.type === "boolean") {
    return typeof value === "boolean";
  }

  if (field.type === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }

  return typeof value === "string";
}

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

  const result = publicOrderEntryRequestSchema.safeParse(body);

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

  const locale = normalizeLocale(result.data.locale);
  const tokenValid = await validateOrderEntryToken(result.data.token);

  if (!tokenValid) {
    return Response.json(
      { error: "ORDER_ENTRY_UNAVAILABLE", success: false },
      { status: 404 }
    );
  }

  const product = await getPublicProductByIdOrSlug(locale, result.data.productId);

  if (!product) {
    return Response.json(
      {
        error: "INVALID_PRODUCT",
        fieldErrors: { productId: ["product"] },
        success: false,
      },
      { status: 400 }
    );
  }

  const productOptions = product.optionGroup?.options ?? [];
  const productOptionById = new Map(
    productOptions.map((option) => [option.id, option])
  );
  const canonicalOptionValues = new Map<
    string,
    {
      field: CatalogProductOptionField;
      value: OptionFieldValue;
    }
  >();
  const optionFieldErrors: Record<string, string[]> = {};

  for (const option of result.data.optionValues) {
    const field = productOptionById.get(option.optionId);

    if (!field) {
      return Response.json(
        {
          error: "INVALID_PRODUCT_OPTION",
          fieldErrors: { productId: ["product"] },
          success: false,
        },
        { status: 400 }
      );
    }

    const normalizedValue = normalizeFieldValue(field.type, option.value);

    if (!isValidFieldValue(field, normalizedValue)) {
      optionFieldErrors[field.id] = ["invalid"];
      continue;
    }

    canonicalOptionValues.set(field.id, {
      field,
      value: normalizedValue,
    });
  }

  productOptions.forEach((field) => {
    if (
      field.isRequired &&
      isMissingRequiredValue(field.type, canonicalOptionValues.get(field.id)?.value)
    ) {
      optionFieldErrors[field.id] = ["required"];
    }
  });

  if (Object.keys(optionFieldErrors).length > 0) {
    return Response.json(
      {
        error: "INVALID_INPUT",
        fieldErrors: optionFieldErrors,
        success: false,
      },
      { status: 400 }
    );
  }

  const pseudoViewer = {
    email: "",
    id: "",
    isActive: true,
    linkedEmployeeId: undefined,
    name: "External order entry",
    role: "super_admin" as const,
    workshopId: undefined,
  };

  try {
    const orderResult = await createOrder(
      pseudoViewer,
      {
        attachments: [],
        currency: "EUR",
        customerEmail: result.data.customerEmail,
        customerLanguage: locale,
        customerName: result.data.customerName,
        customerPhone: result.data.customerPhone,
        customerReference: "",
        dueDate: "",
        emailUpdatesEnabled:
          result.data.customerEmail.length > 0 && result.data.emailUpdatesEnabled,
        goldDetails: {},
        measurements: {},
        notes: {
          adminNotes: "",
          customerNotes: result.data.message,
          deliveryNotes: "",
          packagingNotes: "",
          qualityRequirements: "",
          specialInstructions: "",
          workshopNotes: "",
        },
        personalization: {},
        priority: "normal",
        productCategoryName: product.categoryName,
        productCategorySlug: product.categorySlug || "all",
        productId: product.id,
        productImage: product.imageUrl,
        productName: product.name,
        productSku: product.sku,
        productSlug: product.slug,
        productSpecifications: {
          karat: null,
          nameCustomization: {
            enabled: false,
            language: null,
            text: null,
          },
          weightGrams: null,
        },
        quantity: result.data.quantity,
        referenceImages: [],
        selectedOptions: Array.from(canonicalOptionValues.values()).map(
          ({ field, value }) => ({
            groupKey: product.optionGroup?.key ?? "order-entry",
            key: field.key,
            label: field.label,
            optionId: field.id,
            type: field.type,
            value,
          })
        ),
        stones: {},
        totalAmount: null,
      },
      locale
    );

    return Response.json({
      orderId: orderResult.orderId,
      success: true,
      trackingNumber: orderResult.trackingNumber,
    });
  } catch (error) {
    console.error("[order-entry] failed to create order", error);

    return Response.json(
      { error: "ORDER_ENTRY_FAILED", success: false },
      { status: 500 }
    );
  }
}
