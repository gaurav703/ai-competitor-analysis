import { z } from 'zod';
import { evidenceSchema } from './shared';
import { DIMENSION_KEYS } from './metric';

// Scorecard (spec §4): one snapshot per recompute run, kept for history (never overwritten).
const subjectScoreSchema = z.object({
  subject: z.object({ type: z.enum(['self', 'competitor']), id: z.uuid().optional() }),
  dimensionScores: z.record(z.enum(DIMENSION_KEYS), z.number().min(0).max(100).nullable()),
  overall: z.number().min(0).max(100).nullable(),
  rank: z.int().positive().nullable(),
});

export const scorecardSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  computedAt: z.date(),
  scores: z.array(subjectScoreSchema).min(1),
  weights: z.record(z.enum(DIMENSION_KEYS), z.number().positive()),
});
export type Scorecard = z.infer<typeof scorecardSchema>;

export const TRENDS = ['new', 'widening', 'stable', 'narrowing'] as const;
export type Trend = (typeof TRENDS)[number];

export const IMPACT_LEVELS = ['high', 'medium', 'low'] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const ITEM_STATUSES = ['open', 'dismissed', 'addressed'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

// LagItem (spec §4 / §2A): the core "where am I behind" unit. Ranked by the priority formula
// in SYSTEM_DESIGN §7.3; the LLM writes only `investigation` and the reason text.
export const lagItemSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  dimensionKey: z.enum(DIMENSION_KEYS),
  metricId: z.string().optional(),
  offeringId: z.uuid().optional(), // set when this is an offering gap, not a metric
  title: z.string().trim().min(1).max(300),
  competitorsAhead: z.array(z.uuid()).default([]),
  evidenceEventIds: z.array(z.uuid()).default([]),
  evidence: z.array(evidenceSchema).default([]),
  relatedReviewThemeIds: z.array(z.uuid()).default([]),
  trend: z.enum(TRENDS),
  impact: z.enum(IMPACT_LEVELS),
  impactReason: z.string().trim().min(1).max(500),
  priorityScore: z.number(),
  investigation: z.string().trim().min(1).max(500), // "Evaluate ..." - never a directive
  status: z.enum(ITEM_STATUSES).default('open'),
  firstSeenAt: z.date(),
  updatedAt: z.date(),
});
export type LagItem = z.infer<typeof lagItemSchema>;

// StrengthItem (spec §4): the mirror of LagItem - what to protect and promote.
export const strengthItemSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  dimensionKey: z.enum(DIMENSION_KEYS),
  metricId: z.string().optional(),
  offeringId: z.uuid().optional(),
  title: z.string().trim().min(1).max(300),
  type: z.enum(['leading', 'unique']),
  competitorsBehind: z.array(z.uuid()).default([]),
  evidence: z.array(evidenceSchema).default([]),
  matchedCompetitorWeaknesses: z.array(z.uuid()).default([]), // ReviewTheme ids
});
export type StrengthItem = z.infer<typeof strengthItemSchema>;

// Gap (spec §4): an offering the user lacks that N+ competitors have (F9's offering-gap lag items).
export const gapSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  offeringId: z.uuid(),
  competitorsWithIt: z.array(z.uuid()).min(1),
  evidenceEventIds: z.array(z.uuid()).default([]),
  firstSeenAt: z.date(),
  status: z.enum(['open', 'dismissed', 'addressed']).default('open'),
});
export type Gap = z.infer<typeof gapSchema>;

// Pattern (spec §4 / F10): cross-competitor grouping over a time window. Grouping and
// thresholds are code (SYSTEM_DESIGN §8.2); the LLM writes only `summary`.
export const patternSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  theme: z.string().trim().min(1).max(200),
  eventIds: z.array(z.uuid()).min(1),
  competitorCount: z.int().positive(),
  windowDays: z.int().positive(),
  summary: z.string().trim().min(1).max(500),
  detectedAt: z.date(),
});
export type Pattern = z.infer<typeof patternSchema>;

export const REVIEW_SENTIMENTS = ['positive', 'negative'] as const;
export type ReviewSentiment = (typeof REVIEW_SENTIMENTS)[number];

// ReviewTheme (spec §4 / F11): clustered customer feedback, one row per theme per period.
export const reviewThemeSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  competitorId: z.uuid().optional(), // absent = the user's own reviews
  theme: z.string().trim().min(1).max(200),
  sentiment: z.enum(REVIEW_SENTIMENTS),
  mentionCount: z.int().nonnegative(),
  exampleExcerpts: z.array(z.string().max(1000)).default([]),
  periodStart: z.date(),
  periodEnd: z.date(),
});
export type ReviewTheme = z.infer<typeof reviewThemeSchema>;

// Brief (spec §4 / F13): the weekly generated summary, stored and then delivered per channel.
export const briefSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  periodStart: z.date(),
  periodEnd: z.date(),
  sections: z.object({
    topDevelopments: z.array(z.unknown()).default([]),
    newGaps: z.array(z.unknown()).default([]),
    patterns: z.array(z.unknown()).default([]),
    reviewThemes: z.array(z.unknown()).default([]),
    risks: z.array(z.unknown()).default([]),
  }),
  deliveredAt: z.date().optional(),
  channels: z.array(z.enum(['email', 'telegram'])).default([]),
});
export type Brief = z.infer<typeof briefSchema>;
