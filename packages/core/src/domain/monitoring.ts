import { z } from 'zod';

// Source (spec §4). One entry per monitored source, for the user's own business
// (subjectType = 'self') or a competitor.
export const SOURCE_TYPES = [
  'website',
  'pricing_page',
  'product_catalog',
  'menu',
  'changelog',
  'blog',
  'play_store',
  'app_store',
  'google_business',
  'marketplace_listing',
  'google_news',
  'reddit',
  'rss',
  'jobs',
  'social',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_STATUSES = ['active', 'unhealthy', 'paused'] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const sourceSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  subjectType: z.enum(['self', 'competitor']),
  subjectId: z.uuid().optional(), // required when subjectType = 'competitor'
  type: z.enum(SOURCE_TYPES),
  url: z.url(),
  config: z.record(z.string(), z.unknown()).optional(),
  lastHash: z.string().optional(),
  lastFetchedAt: z.date().optional(),
  status: z.enum(SOURCE_STATUSES).default('active'),
  errorCount: z.int().nonnegative().default(0),
});
export type Source = z.infer<typeof sourceSchema>;

// Competitor (spec §4). Offerings/pricing are maintained from events (F3-F8), not entered here.
export const competitorInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  website: z.url().optional(),
  locations: z.array(z.string().trim().min(1)).optional(),
});
export type CompetitorInput = z.infer<typeof competitorInputSchema>;

// Snapshot (spec §4): raw evidence, required for trust. Never guessed, never edited.
export const snapshotSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  sourceId: z.uuid(),
  hash: z.string().min(1),
  content: z.string(),
  fetchedAt: z.date(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
