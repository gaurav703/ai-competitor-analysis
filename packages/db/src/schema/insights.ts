import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  DimensionKey,
  Evidence,
  ImpactLevel,
  ItemStatus,
  ReviewSentiment,
  Trend,
} from '@cip/core';
import { workspaces } from './workspaces';
import { competitors } from './monitoring';
import { offerings } from './catalog';
import { events } from './events';

type SubjectScore = {
  subject: { type: 'self' | 'competitor'; id?: string };
  dimensionScores: Partial<Record<DimensionKey, number | null>>;
  overall: number | null;
  rank: number | null;
};

// Scorecard (spec §4): append-only, one row per recompute run (§5.2 history rule).
export const scorecards = pgTable(
  'scorecards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    scores: jsonb('scores').$type<SubjectScore[]>().notNull(),
    weights: jsonb('weights').$type<Partial<Record<DimensionKey, number>>>().notNull(),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('scorecards_workspace_id_idx').on(t.workspaceId)],
).enableRLS();

export type ScorecardRow = typeof scorecards.$inferSelect;
export type NewScorecardRow = typeof scorecards.$inferInsert;

// LagItem (spec §4 / §2A): the core "where am I behind" unit, mutable (status changes on
// dismiss/address; SYSTEM_DESIGN §7.3).
export const lagItems = pgTable(
  'lag_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    dimensionKey: text('dimension_key').$type<DimensionKey>().notNull(),
    metricId: text('metric_id'),
    offeringId: uuid('offering_id').references(() => offerings.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    competitorsAhead: text('competitors_ahead').array().notNull().default([]),
    evidence: jsonb('evidence').$type<Evidence[]>().notNull().default([]),
    relatedReviewThemeIds: text('related_review_theme_ids').array().notNull().default([]),
    trend: text('trend').$type<Trend>().notNull(),
    impact: text('impact').$type<ImpactLevel>().notNull(),
    impactReason: text('impact_reason').notNull(),
    priorityScore: numeric('priority_score', { precision: 10, scale: 4 }).notNull(),
    investigation: text('investigation').notNull(), // "Evaluate ..." - never a directive (spec §2)
    status: text('status').$type<ItemStatus>().notNull().default('open'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('lag_items_workspace_id_idx').on(t.workspaceId),
    index('lag_items_status_idx').on(t.status),
  ],
).enableRLS();

export type LagItemRow = typeof lagItems.$inferSelect;
export type NewLagItemRow = typeof lagItems.$inferInsert;

export const lagItemEvents = pgTable(
  'lag_item_events',
  {
    lagItemId: uuid('lag_item_id')
      .notNull()
      .references(() => lagItems.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.lagItemId, t.eventId] })],
).enableRLS();

// StrengthItem (spec §4): the mirror of LagItem.
export const strengthItems = pgTable(
  'strength_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    dimensionKey: text('dimension_key').$type<DimensionKey>().notNull(),
    metricId: text('metric_id'),
    offeringId: uuid('offering_id').references(() => offerings.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    type: text('type').$type<'leading' | 'unique'>().notNull(),
    competitorsBehind: text('competitors_behind').array().notNull().default([]),
    evidence: jsonb('evidence').$type<Evidence[]>().notNull().default([]),
    matchedCompetitorWeaknesses: text('matched_competitor_weaknesses')
      .array()
      .notNull()
      .default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('strength_items_workspace_id_idx').on(t.workspaceId)],
).enableRLS();

export type StrengthItemRow = typeof strengthItems.$inferSelect;
export type NewStrengthItemRow = typeof strengthItems.$inferInsert;

// Gap (spec §4): an offering the user lacks that N+ competitors have.
export const gaps = pgTable(
  'gaps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    offeringId: uuid('offering_id')
      .notNull()
      .references(() => offerings.id, { onDelete: 'cascade' }),
    competitorsWithIt: text('competitors_with_it').array().notNull(),
    evidenceEventIds: text('evidence_event_ids').array().notNull().default([]),
    status: text('status').$type<ItemStatus>().notNull().default('open'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('gaps_workspace_id_idx').on(t.workspaceId)],
).enableRLS();

export type GapRow = typeof gaps.$inferSelect;
export type NewGapRow = typeof gaps.$inferInsert;

// Pattern (spec §4 / F10): cross-competitor grouping over a time window.
export const patterns = pgTable(
  'patterns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    theme: text('theme').notNull(),
    competitorCount: integer('competitor_count').notNull(),
    windowDays: integer('window_days').notNull(),
    summary: text('summary').notNull(),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('patterns_workspace_id_idx').on(t.workspaceId)],
).enableRLS();

export type PatternRow = typeof patterns.$inferSelect;
export type NewPatternRow = typeof patterns.$inferInsert;

export const patternEvents = pgTable(
  'pattern_events',
  {
    patternId: uuid('pattern_id')
      .notNull()
      .references(() => patterns.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.patternId, t.eventId] })],
).enableRLS();

// ReviewTheme (spec §4 / F11): one row per clustered theme per competitor per period.
export const reviewThemes = pgTable(
  'review_themes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    competitorId: uuid('competitor_id').references(() => competitors.id, { onDelete: 'cascade' }), // null = the user's own reviews
    theme: text('theme').notNull(),
    sentiment: text('sentiment').$type<ReviewSentiment>().notNull(),
    mentionCount: integer('mention_count').notNull(),
    exampleExcerpts: text('example_excerpts').array().notNull().default([]),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('review_themes_workspace_id_idx').on(t.workspaceId),
    index('review_themes_competitor_id_idx').on(t.competitorId),
  ],
).enableRLS();

export type ReviewThemeRow = typeof reviewThemes.$inferSelect;
export type NewReviewThemeRow = typeof reviewThemes.$inferInsert;

type BriefSections = {
  topDevelopments: unknown[];
  newGaps: unknown[];
  patterns: unknown[];
  reviewThemes: unknown[];
  risks: unknown[];
};

// Brief (spec §4 / F13): the weekly generated summary.
export const briefs = pgTable(
  'briefs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    sections: jsonb('sections').$type<BriefSections>().notNull(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    channels: text('channels').array().$type<('email' | 'telegram')[]>().notNull().default([]),
  },
  (t) => [index('briefs_workspace_id_idx').on(t.workspaceId)],
).enableRLS();

export type BriefRow = typeof briefs.$inferSelect;
export type NewBriefRow = typeof briefs.$inferInsert;
