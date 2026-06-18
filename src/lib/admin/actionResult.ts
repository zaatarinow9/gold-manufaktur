export type AdminActionResult =
  | {
      fieldErrors?: Record<string, string>;
      message: string;
      ok: true;
    }
  | {
      fieldErrors?: Record<string, string>;
      message: string;
      ok: false;
    };
