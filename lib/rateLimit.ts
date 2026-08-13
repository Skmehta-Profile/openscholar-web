import "server-only";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store =
  new Map<
    string,
    RateLimitEntry
  >();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();

  const existing =
    store.get(key);

  if (
    !existing ||
    existing.resetAt <= now
  ) {
    store.set(key, {
      count: 1,
      resetAt:
        now + windowMs,
    });

    return {
      allowed: true,
      remaining:
        Math.max(
          limit - 1,
          0
        ),
      retryAfterSeconds: 0,
    };
  }

  if (
    existing.count >= limit
  ) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds:
        Math.max(
          Math.ceil(
            (
              existing.resetAt -
              now
            ) / 1000
          ),
          1
        ),
    };
  }

  existing.count += 1;

  store.set(
    key,
    existing
  );

  return {
    allowed: true,
    remaining:
      Math.max(
        limit -
          existing.count,
        0
      ),
    retryAfterSeconds: 0,
  };
}