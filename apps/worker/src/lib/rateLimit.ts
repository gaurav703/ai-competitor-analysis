import type { Redis } from 'ioredis';

// Per-domain rate limit (SYSTEM_DESIGN §10: "1 request / 10s" for fetch-source), enforced with
// a Redis lock so it holds across all worker processes, not just in-memory per instance.
//
// SET key value PX <ms> NX succeeds only if the key doesn't already exist - that's the "was
// this domain fetched too recently" check and the "mark it as fetched now" write, atomically,
// in one round trip.
export async function tryAcquireDomainSlot(
  redis: Redis,
  domain: string,
  minIntervalMs: number,
): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }> {
  const key = `domain-rate-limit:${domain}`;
  const acquired = await redis.set(key, '1', 'PX', minIntervalMs, 'NX');
  if (acquired === 'OK') return { allowed: true };

  const remainingMs = await redis.pttl(key);
  return { allowed: false, retryAfterMs: remainingMs > 0 ? remainingMs : minIntervalMs };
}

export function domainOf(url: string): string {
  return new URL(url).hostname;
}
