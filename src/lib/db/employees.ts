import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getEmployees() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load employees: ${error.message}`);
  }

  return data;
}
