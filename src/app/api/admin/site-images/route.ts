import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAdminSessionContext } from "@/lib/admin/auth";
import {
  resetStaticSiteImage,
  replaceStaticSiteImage,
  SiteSettingsError,
} from "@/lib/db/siteSettings";
import { isAdminDecoyEnabled } from "@/lib/db/adminDecoy";
import { routing } from "@/i18n/routing";
import {
  buildStaticSiteImageObjectPath,
  isAllowedStaticSiteImageMimeType,
  isStaticSiteImageSlot,
  STATIC_SITE_IMAGE_BUCKET,
  STATIC_SITE_IMAGE_MAX_BYTES,
} from "@/lib/site-images";
import { getContentLength, hasTrustedOrigin } from "@/lib/security/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  deleteSiteImageObjects,
  ensureSiteImagesBucket,
} from "@/lib/storage/siteImages";

const SITE_IMAGE_MULTIPART_MAX_BYTES = STATIC_SITE_IMAGE_MAX_BYTES + 64 * 1024;

function revalidateSiteImageViews() {
  routing.locales.forEach((locale) => {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/shop`);
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/admin/archive`);
    revalidatePath(`/${locale}/admin/orders`);
    revalidatePath(`/${locale}/admin/settings`);
    revalidatePath(`/${locale}/admin/my-tasks`);
  });
}

async function requireSiteImageAccess() {
  const session = await getAdminSessionContext();

  if (session.state === "anonymous" || !session.authUserId) {
    return { error: "UNAUTHORIZED" as const };
  }

  if (
    session.state !== "authenticated" ||
    !session.user ||
    session.user.role !== "super_admin"
  ) {
    return { error: "FORBIDDEN" as const };
  }

  return { user: session.user };
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN", success: false }, { status: 403 });
  }

  const contentLength = getContentLength(request.headers);

  if (
    contentLength !== null &&
    contentLength > SITE_IMAGE_MULTIPART_MAX_BYTES
  ) {
    return NextResponse.json(
      { error: "FILE_TOO_LARGE", success: false },
      { status: 413 }
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "INVALID_FORM_DATA", success: false },
      { status: 400 }
    );
  }

  const access = await requireSiteImageAccess();

  if ("error" in access) {
    return NextResponse.json({ error: access.error, success: false }, { status: 403 });
  }

  if (await isAdminDecoyEnabled()) {
    return NextResponse.json(
      { error: "SYNC_UNAVAILABLE", success: false },
      { status: 423 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const slot = formData.get("slot");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE", success: false }, { status: 400 });
  }

  if (typeof slot !== "string" || !isStaticSiteImageSlot(slot)) {
    return NextResponse.json({ error: "INVALID_SLOT", success: false }, { status: 400 });
  }

  if (!isAllowedStaticSiteImageMimeType(file.type)) {
    return NextResponse.json(
      { error: "INVALID_FILE_TYPE", success: false },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > STATIC_SITE_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { error: "FILE_TOO_LARGE", success: false },
      { status: 400 }
    );
  }

  let objectPath = "";

  try {
    await ensureSiteImagesBucket();

    objectPath = buildStaticSiteImageObjectPath({
      fileName: file.name,
      mimeType: file.type,
      slot,
    });

    const supabase = createSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from(STATIC_SITE_IMAGE_BUCKET)
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
    } = supabase.storage.from(STATIC_SITE_IMAGE_BUCKET).getPublicUrl(objectPath);
    const result = await replaceStaticSiteImage({
      publicUrl,
      slot,
      storagePath: objectPath,
    });

    if (
      result.previous?.storagePath &&
      result.previous.storagePath !== result.current.storagePath
    ) {
      await deleteSiteImageObjects([result.previous.storagePath]);
    }

    revalidateSiteImageViews();

    return NextResponse.json({
      image: result.current,
      success: true,
    });
  } catch (error) {
    if (objectPath) {
      await deleteSiteImageObjects([objectPath]);
    }

    return NextResponse.json(
      {
        error:
          error instanceof SiteSettingsError
            ? "SETTINGS_UNAVAILABLE"
            : "UPLOAD_FAILED",
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN", success: false }, { status: 403 });
  }

  const access = await requireSiteImageAccess();

  if ("error" in access) {
    return NextResponse.json({ error: access.error, success: false }, { status: 403 });
  }

  if (await isAdminDecoyEnabled()) {
    return NextResponse.json(
      { error: "SYNC_UNAVAILABLE", success: false },
      { status: 423 }
    );
  }

  let slot = "";

  try {
    const body = (await request.json()) as { slot?: unknown };
    slot = typeof body.slot === "string" ? body.slot : "";
  } catch {
    return NextResponse.json(
      { error: "INVALID_FORM_DATA", success: false },
      { status: 400 }
    );
  }

  if (!isStaticSiteImageSlot(slot)) {
    return NextResponse.json({ error: "INVALID_SLOT", success: false }, { status: 400 });
  }

  try {
    const previous = await resetStaticSiteImage(slot);

    if (previous?.storagePath) {
      await deleteSiteImageObjects([previous.storagePath]);
    }

    revalidateSiteImageViews();

    return NextResponse.json({
      image: null,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof SiteSettingsError
            ? "SETTINGS_UNAVAILABLE"
            : "UPLOAD_FAILED",
        success: false,
      },
      { status: 500 }
    );
  }
}
