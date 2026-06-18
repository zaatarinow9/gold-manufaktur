import { NextResponse } from "next/server";

import { getAdminSessionContext } from "@/lib/admin/auth";
import {
  buildProductImageObjectPath,
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_IMAGE_MAX_BYTES,
} from "@/lib/product-images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureProductImagesBucket } from "@/lib/storage/productImages";

function isAllowedMimeType(value: string) {
  return PRODUCT_IMAGE_ALLOWED_MIME_TYPES.includes(
    value as (typeof PRODUCT_IMAGE_ALLOWED_MIME_TYPES)[number]
  );
}

export async function POST(request: Request) {
  const session = await getAdminSessionContext();

  if (session.state === "anonymous" || !session.authUserId) {
    return NextResponse.json({ error: "UNAUTHORIZED", success: false }, { status: 401 });
  }

  if (
    session.state !== "authenticated" ||
    !session.user ||
    !["super_admin", "admin"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "FORBIDDEN", success: false }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const productSku = formData.get("productSku");
  const productSlug = formData.get("productSlug");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE", success: false }, { status: 400 });
  }

  if (!isAllowedMimeType(file.type)) {
    return NextResponse.json(
      { error: "INVALID_FILE_TYPE", success: false },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { error: "FILE_TOO_LARGE", success: false },
      { status: 400 }
    );
  }

  try {
    await ensureProductImagesBucket();

    const objectPath = buildProductImageObjectPath({
      fileName: file.name,
      mimeType: file.type,
      productSku: typeof productSku === "string" ? productSku : undefined,
      productSlug: typeof productSlug === "string" ? productSlug : undefined,
    });

    const supabase = createSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(objectPath, new Uint8Array(await file.arrayBuffer()), {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error: "UPLOAD_FAILED",
          success: false,
        },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(objectPath);

    return NextResponse.json({
      path: objectPath,
      success: true,
      url: publicUrl,
    });
  } catch {
    return NextResponse.json(
      {
        error: "UPLOAD_FAILED",
        success: false,
      },
      { status: 500 }
    );
  }
}
