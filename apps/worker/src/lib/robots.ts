import robotsParser from 'robots-parser';

// robots.txt compliance (spec §7 non-goals / SYSTEM_DESIGN §13). Cached per-origin in memory
// for the life of the worker process - robots.txt changes rarely, and re-fetching it before
// every single source fetch would double the request volume for no benefit.
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { robot: ReturnType<typeof robotsParser>; expiresAt: number }>();

async function getRobot(origin: string, userAgent: string) {
  const cached = cache.get(origin);
  if (cached && cached.expiresAt > Date.now()) return cached.robot;

  const robotsUrl = `${origin}/robots.txt`;
  let body = '';
  try {
    const res = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) body = await res.text();
    // A missing or erroring robots.txt means "no restrictions" per the standard - `body`
    // stays empty, which robots-parser treats as allow-all.
  } catch {
    body = '';
  }

  const robot = robotsParser(robotsUrl, body);
  cache.set(origin, { robot, expiresAt: Date.now() + CACHE_TTL_MS });
  return robot;
}

export async function isAllowedByRobots(url: string, userAgent: string): Promise<boolean> {
  const parsed = new URL(url);
  const robot = await getRobot(parsed.origin, userAgent);
  return robot.isAllowed(url, userAgent) !== false; // undefined (unparseable) => allow
}
