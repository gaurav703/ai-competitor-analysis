import { z } from 'zod';
import type { Trend } from '../domain/insights';

// Every number that shapes scoring, gaps, dedup or pattern detection lives here - never in a
// prompt, never inline in pipeline code (CLAUDE.md conventions; spec §9, §10).
const thresholdsSchema = z.object({
  // Comparison engine (SYSTEM_DESIGN §7.1-§7.3)
  minKnownCompetitors: z.int().positive(), // below this, a metric's status is 'unknown'
  equalTolerance: z.number().positive(), // +-5%: numeric values within this count as 'equal'
  minDimensionCoverage: z.number().min(0).max(1), // known/defined metrics below this -> null score
  gapMinCompetitors: z.int().positive(), // offering gap needs at least this many competitors
  trendMultipliers: z.object({
    widening: z.number().positive(),
    new: z.number().positive(),
    stable: z.number().positive(),
    narrowing: z.number().positive(),
  }),

  // Pattern detection (SYSTEM_DESIGN §8.2)
  patternWindowDays: z.int().positive(),
  patternMinCompetitors: z.int().positive(),
  patternMinCompetitorShare: z.number().min(0).max(1),

  // Monitoring / dedup (spec §3, §5 F5)
  websiteConfirmFetches: z.int().positive(), // a website diff must persist across this many fetches
  dedupWindowHours: z.int().positive(), // same competitor+type+subject within this window -> merge

  // Jobs (SYSTEM_DESIGN §10)
  recomputeDebounceMinutes: z.int().positive(),
  sourceUnhealthyAfterFailures: z.int().positive(),
});

export const THRESHOLDS = thresholdsSchema.parse({
  minKnownCompetitors: 2,
  equalTolerance: 0.05,
  minDimensionCoverage: 0.3,
  gapMinCompetitors: 2,
  trendMultipliers: { widening: 1.3, new: 1.2, stable: 1.0, narrowing: 0.8 },

  patternWindowDays: 90,
  patternMinCompetitors: 3,
  patternMinCompetitorShare: 0.5,

  websiteConfirmFetches: 2,
  dedupWindowHours: 72,

  recomputeDebounceMinutes: 5,
  sourceUnhealthyAfterFailures: 5,
});

export function trendMultiplier(trend: Trend): number {
  return THRESHOLDS.trendMultipliers[trend];
}
