import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Marks every dashboard page (all languages, including the sidebar counts in
 * the layout) as out of date, so a change shows up at once without a manual
 * reload – also on pages the client router had cached.
 */
export function revalidateDashboard() {
  revalidatePath("/[locale]/admin", "layout");
}
