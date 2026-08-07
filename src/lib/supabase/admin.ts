import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required Supabase environment variable: ${name}`);
  }

  return value;
}

export function createSupabaseAdminClient() {
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
