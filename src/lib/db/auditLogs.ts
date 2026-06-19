import "server-only";

import type { Json } from "@/lib/supabase/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AuditLogInput = {
  action: string;
  actorEmail?: string | null;
  metadata?: Json;
};

type AuditLogClient = {
  from: (table: "audit_logs") => {
    insert: (value: {
      action: string;
      actor_email: string | null;
      metadata_json: Json;
    }) => Promise<{ error: { message: string } | null }>;
  };
};

export async function createAuditLog(input: AuditLogInput) {
  try {
    const supabase = createSupabaseAdminClient() as unknown as AuditLogClient;
    const { error } = await supabase.from("audit_logs").insert({
      action: input.action,
      actor_email: input.actorEmail?.trim() || null,
      metadata_json: input.metadata ?? {},
    });

    if (error) {
      console.warn(`[audit] Unable to create audit log: ${error.message}`);
    }
  } catch (error) {
    console.warn(
      `[audit] Unable to create audit log: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
