import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load orders: ${error.message}`);
  }

  return data;
}
