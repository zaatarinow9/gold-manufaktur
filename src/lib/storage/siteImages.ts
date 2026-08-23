import "server-only";

import {
  STATIC_SITE_IMAGE_ALLOWED_MIME_TYPES,
  STATIC_SITE_IMAGE_BUCKET,
  STATIC_SITE_IMAGE_FILE_SIZE_LIMIT,
} from "@/lib/site-images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

let ensureBucketPromise: Promise<void> | null = null;

function isDuplicateBucketError(error: { message?: string; status?: number } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.status === 409 || message.includes("already exists");
}

export async function ensureSiteImagesBucket() {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const supabase = createSupabaseAdminClient();
      const createResult = await supabase.storage.createBucket(STATIC_SITE_IMAGE_BUCKET, {
        allowedMimeTypes: [...STATIC_SITE_IMAGE_ALLOWED_MIME_TYPES],
        fileSizeLimit: STATIC_SITE_IMAGE_FILE_SIZE_LIMIT,
        public: true,
      });

      if (!createResult.error) {
        return;
      }

      if (!isDuplicateBucketError(createResult.error)) {
        throw new Error(
          `Unable to prepare site image bucket: ${createResult.error.message}`
        );
      }

      const updateResult = await supabase.storage.updateBucket(STATIC_SITE_IMAGE_BUCKET, {
        allowedMimeTypes: [...STATIC_SITE_IMAGE_ALLOWED_MIME_TYPES],
        fileSizeLimit: STATIC_SITE_IMAGE_FILE_SIZE_LIMIT,
        public: true,
      });

      if (updateResult.error) {
        throw new Error(
          `Unable to update site image bucket: ${updateResult.error.message}`
        );
      }
    })().catch((error) => {
      ensureBucketPromise = null;
      throw error;
    });
  }

  return ensureBucketPromise;
}

export async function deleteSiteImageObjects(objectPaths: string[]) {
  const uniqueObjectPaths = [
    ...new Set(objectPaths.map((value) => value.trim()).filter(Boolean)),
  ];

  if (uniqueObjectPaths.length === 0) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(STATIC_SITE_IMAGE_BUCKET)
    .remove(uniqueObjectPaths);

  if (error) {
    console.warn(`[siteImages] Unable to delete storage objects: ${error.message}`);
  }
}
