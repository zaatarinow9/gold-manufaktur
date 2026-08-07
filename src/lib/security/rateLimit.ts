import "server-only";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const rateLimitStoreKey = "__gold_helwah_rate_limit_store__";
const rateLimitCleanupKey = "__gold_helwah_rate_limit_cleanup__";

function getRateLimitStore() {
  const globalState = globalThis as typeof globalThis & {
    [rateLimitCleanupKey]?: number;
    [rateLimitStoreKey]?: Map<string, RateLimitEntry>;
  };

  if (!globalState[rateLimitStoreKey]) {
    globalState[rateLimitStoreKey] = new Map<string, RateLimitEntry>();
  }

  return globalState;
}

function cleanupExpiredEntries(now: number) {
  const globalState = getRateLimitStore();
  const lastCleanup = globalState[rateLimitCleanupKey] ?? 0;

  if (now - lastCleanup < 60_000) {
    return;
  }

  globalState[rateLimitCleanupKey] = now;

  for (const [key, entry] of globalState[rateLimitStoreKey]!.entries()) {
    if (entry.resetAt <= now) {
      globalState[rateLimitStoreKey]!.delete(key);
    }
  }
}

export function consumeRateLimit(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const globalState = getRateLimitStore();
  const store = globalState[rateLimitStoreKey]!;
  const existing = store.get(input.key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + input.windowMs;
    store.set(input.key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: Math.max(input.limit - 1, 0),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;
  store.set(input.key, existing);

  const allowed = existing.count <= input.limit;

  return {
    allowed,
    remaining: Math.max(input.limit - existing.count, 0),
    resetAt: existing.resetAt,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}
