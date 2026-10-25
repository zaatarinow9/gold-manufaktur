import { NextResponse } from "next/server";

import { getAdminSessionContext } from "@/lib/admin/auth";
import { revalidateDashboard } from "@/lib/admin/revalidate";
import { getContentLength, hasTrustedOrigin } from "@/lib/security/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function currentUser() {
  const session = await getAdminSessionContext();
  return session.state === "authenticated" && session.user ? session.user : null;
}

async function removeOldFiles(userId: string, keep?: string) {
  const storage = createSupabaseAdminClient().storage.from(BUCKET);
  const { data } = await storage.list(userId);
  const stale = (data ?? []).map((file) => `${userId}/${file.name}`).filter((path) => path !== keep);
  if (stale.length) await storage.remove(stale);
}

/** Uploads the signed-in person's own profile picture. */
export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const length = getContentLength(request.headers);
  if (length !== null && length > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  const extension = TYPES[file.type];
  if (!extension) return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });

  const supabase = createSupabaseAdminClient();
  const path = `${user.id}/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { cacheControl: "31536000", contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });

  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  await removeOldFiles(user.id, path);
  revalidateDashboard();
  return NextResponse.json({ avatarUrl: publicUrl, success: true });
}

/** Removes the profile picture; initials are shown again. */
export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  await createSupabaseAdminClient().from("profiles").update({ avatar_url: null }).eq("id", user.id);
  await removeOldFiles(user.id);
  revalidateDashboard();
  return NextResponse.json({ success: true });
}
