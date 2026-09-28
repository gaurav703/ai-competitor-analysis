import { z } from 'zod';
import type { SourceType } from '../domain/monitoring';
import { SOURCE_TYPES } from '../domain/monitoring';

// Fetch interval per source type (SYSTEM_DESIGN §10 jobs table). A source is "due" when
// now - lastFetchedAt >= its type's interval (or it has never been fetched).
const hours = (h: number) => h * 60 * 60 * 1000;

const schema = z.record(z.enum(SOURCE_TYPES), z.number().positive());

export const SOURCE_FETCH_INTERVAL_MS: Record<SourceType, number> = schema.parse({
  website: hours(24),
  pricing_page: hours(24),
  product_catalog: hours(24),
  menu: hours(24),
  changelog: hours(24),
  blog: hours(24),
  google_news: hours(6),
  rss: hours(6),
  play_store: hours(24),
  app_store: hours(24),
  google_business: hours(24),
  marketplace_listing: hours(24),
  reddit: hours(12),
  jobs: hours(24),
  social: hours(12),
});

// How often the scheduler scans for due sources - independent of any one source's interval.
export const SCHEDULER_SCAN_INTERVAL_MS = 5 * 60 * 1000;

export function isSourceDue(
  type: SourceType,
  lastFetchedAt: Date | null,
  now = new Date(),
): boolean {
  if (!lastFetchedAt) return true;
  return now.getTime() - lastFetchedAt.getTime() >= SOURCE_FETCH_INTERVAL_MS[type];
}
