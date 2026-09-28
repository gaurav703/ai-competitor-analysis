import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type {
  ComparisonStatus,
  ConfidenceLevel,
  DimensionKey,
  Evidence,
  Origin,
  SourceType,
  SubjectType,
  ValueType,
} from '@cip/core';
import { workspaces } from './workspaces';

// Custom metric definitions only (SYSTEM_DESIGN §5.2): built-in ones live in
// packages/core/config/metrics.ts. A workspace can add its own on top.
export const metricDefinitions = pgTable(
  'metric_definitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    dimensionKey: text('dimension_key').$type<DimensionKey>().notNull(),
    name: text('name').notNull(),
    valueType: text('value_type').$type<ValueType>().notNull(),
    higherIsBetter: boolean('higher_is_better'),
    unit: text('unit'),
    sourceTypes: text('source_types').array().$type<SourceType[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('metric_definitions_workspace_id_idx').on(t.workspaceId)],
).enableRLS();

export type MetricDefinitionRow = typeof metricDefinitions.$inferSelect;
export type NewMetricDefinitionRow = typeof metricDefinitions.$inferInsert;

// MetricValue (spec §4): append-only. `metricId` is a free-text id - either a built-in config
// slug (e.g. "delivery_time_minutes") or a metric_definitions.id (uuid-as-text) for customs;
// not an FK, since it can point to either (SYSTEM_DESIGN §5.2).
export const metricValues = pgTable(
  'metric_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    metricId: text('metric_id').notNull(),
    subjectType: text('subject_type').$type<SubjectType>().notNull(),
    subjectId: uuid('subject_id'), // references competitors.id when subjectType = 'competitor'
    value: jsonb('value'),
    origin: text('origin').$type<Origin>().notNull(),
    confidence: text('confidence').$type<ConfidenceLevel>().notNull(),
    evidence: jsonb('evidence').$type<Evidence[]>().notNull().default([]),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('metric_values_workspace_id_idx').on(t.workspaceId),
    index('metric_values_subject_idx').on(t.subjectType, t.subjectId),
    index('metric_values_metric_id_idx').on(t.metricId),
  ],
).enableRLS();

export type MetricValueRow = typeof metricValues.$inferSelect;
export type NewMetricValueRow = typeof metricValues.$inferInsert;

// ComparisonResult (spec §4): recomputed by code (SYSTEM_DESIGN §7); one row per metric per
// run, latest by computedAt is "current" (§5.2 history rule) - never overwritten in place.
export const comparisonResults = pgTable(
  'comparison_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    metricId: text('metric_id').notNull(),
    status: text('status').$type<ComparisonStatus>().notNull(),
    competitorsAhead: text('competitors_ahead').array().notNull().default([]),
    competitorsBehind: text('competitors_behind').array().notNull().default([]),
    selfValue: jsonb('self_value'),
    competitorMedian: jsonb('competitor_median'),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('comparison_results_workspace_id_idx').on(t.workspaceId),
    index('comparison_results_metric_id_idx').on(t.metricId),
  ],
).enableRLS();

export type ComparisonResultRow = typeof comparisonResults.$inferSelect;
export type NewComparisonResultRow = typeof comparisonResults.$inferInsert;
