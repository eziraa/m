type Bucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, Bucket>();

export async function checkRateLimit(input: {
  key: string;
  max: number;
  windowSec: number;
}): Promise<{ allowed: boolean; remaining: number; retryAfterSec: number }> {
  const now = Date.now();
  const windowMs = input.windowSec * 1000;
  const existing = buckets.get(input.key);

  if (!existing || now >= existing.resetAtMs) {
    const next: Bucket = {
      count: 1,
      resetAtMs: now + windowMs,
    };
    buckets.set(input.key, next);

    return {
      allowed: true,
      remaining: Math.max(input.max - 1, 0),
      retryAfterSec: input.windowSec,
    };
  }

  existing.count += 1;
  const remaining = Math.max(input.max - existing.count, 0);

  return {
    allowed: existing.count <= input.max,
    remaining,
    retryAfterSec: Math.max(Math.ceil((existing.resetAtMs - now) / 1000), 0),
  };
}

export async function closeRateLimitClient() {
  buckets.clear();
}

export async function isRateLimitRedisReady() {
  return true;
}
