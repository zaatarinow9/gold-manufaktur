export type AdminActionResult =
  | {
      message: string;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };
