import "server-only";

import {
  extractProductImageObjectPath,
  PRODUCT_IMAGE_ALLOWED_MIME_TYPES,
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_IMAGE_FILE_SIZE_LIMIT,
} from "@/lib/product-images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

let ensureBucketPromise: Promise<void> | null = null;

function isDuplicateBucketError(error: { message?: string; status?: number } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.status === 409 || message.includes("already exists");
}

export async function ensureProductImagesBucket() {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const supabase = createSupabaseAdminClient();
      const createResult = await supabase.storage.createBucket(PRODUCT_IMAGE_BUCKET, {
        allowedMimeTypes: [...PRODUCT_IMAGE_ALLOWED_MIME_TYPES],
        fileSizeLimit: PRODUCT_IMAGE_FILE_SIZE_LIMIT,
        public: true,
      });

      if (!createResult.error) {
        return;
      }

      if (!isDuplicateBucketError(createResult.error)) {
        throw new Error(
          `Unable to prepare product image bucket: ${createResult.error.message}`
        );
      }

      const updateResult = await supabase.storage.updateBucket(PRODUCT_IMAGE_BUCKET, {
        allowedMimeTypes: [...PRODUCT_IMAGE_ALLOWED_MIME_TYPES],
        fileSizeLimit: PRODUCT_IMAGE_FILE_SIZE_LIMIT,
        public: true,
      });

      if (updateResult.error) {
        throw new Error(
          `Unable to update product image bucket: ${updateResult.error.message}`
        );
      }
    })().catch((error) => {
      ensureBucketPromise = null;
      throw error;
    });
  }

  return ensureBucketPromise;
}

export async function deleteProductImageObjects(imageUrls: string[]) {
  const uniqueUrls = [...new Set(imageUrls.map((value) => value.trim()).filter(Boolean))];

  if (uniqueUrls.length === 0) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: remainingImages, error: remainingImagesError } = await supabase
    .from("product_images")
    .select("image_url")
    .in("image_url", uniqueUrls);

  if (remainingImagesError) {
    console.warn(
      `[productImages] Unable to inspect remaining image references: ${remainingImagesError.message}`
    );
    return;
  }

  const referencedUrls = new Set(
    (remainingImages ?? [])
      .map((image) => image.image_url?.trim() ?? "")
      .filter(Boolean)
  );
  const orphanedUrls = uniqueUrls.filter((imageUrl) => !referencedUrls.has(imageUrl));

  if (orphanedUrls.length === 0) {
    return;
  }

  const { url } = getSupabasePublicEnv();
  const objectPaths = orphanedUrls
    .map((imageUrl) => extractProductImageObjectPath(imageUrl, url))
    .filter((path): path is string => Boolean(path));

  if (objectPaths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(objectPaths);

  if (error) {
    console.warn(`[productImages] Unable to delete storage objects: ${error.message}`);
  }
}
