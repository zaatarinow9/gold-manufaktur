export type AdminActionResult =
  | {
      fieldErrors?: Record<string, string>;
      message: string;
      ok: true;
      shouldRefresh?: boolean;
    }
  | {
      fieldErrors?: Record<string, string>;
      message: string;
      ok: false;
      shouldRefresh?: boolean;
    };
