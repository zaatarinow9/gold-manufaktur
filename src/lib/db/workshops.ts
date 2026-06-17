import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getWorkshops() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load workshops: ${error.message}`);
  }

  return data;
}
