import "server-only";

import { cookies } from "next/headers";

import { hashAdminDecoyValue } from "@/lib/db/adminDecoy";

const ADMIN_DECOY_SESSION_COOKIE = "goldhelwah-system-check-session";

type AdminDecoySessionPayload = {
  h: string;
  u: string;
  v: number;
};

function encodePayload(value: AdminDecoySessionPayload) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodePayload(value: string) {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as Partial<AdminDecoySessionPayload>;

    if (
      typeof parsed.h !== "string" ||
      typeof parsed.u !== "string" ||
      typeof parsed.v !== "number"
    ) {
      return null;
    }

    return parsed as AdminDecoySessionPayload;
  } catch {
    return null;
  }
}

function signPayload(value: string) {
  return hashAdminDecoyValue(`session:${value}`);
}

export async function getAdminDecoySession() {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(ADMIN_DECOY_SESSION_COOKIE)?.value ?? "";

  if (!rawValue.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = rawValue.split(".", 2);

  if (!encodedPayload || !signature || signPayload(encodedPayload) !== signature) {
    return null;
  }

  return decodePayload(encodedPayload);
}

export async function hasValidAdminDecoySession(input: {
  tokenHash: string;
  tokenVersion: number;
  userId: string;
}) {
  const payload = await getAdminDecoySession();

  if (!payload) {
    return false;
  }

  return (
    payload.h === input.tokenHash &&
    payload.u === input.userId &&
    payload.v === input.tokenVersion
  );
}

export async function setAdminDecoySession(input: {
  tokenHash: string;
  tokenVersion: number;
  userId: string;
}) {
  const cookieStore = await cookies();
  const payload = encodePayload({
    h: input.tokenHash,
    u: input.userId,
    v: input.tokenVersion,
  });

  cookieStore.set(ADMIN_DECOY_SESSION_COOKIE, `${payload}.${signPayload(payload)}`, {
    httpOnly: true,
    maxAge: 60 * 60 * 6,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminDecoySession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_DECOY_SESSION_COOKIE);
}
