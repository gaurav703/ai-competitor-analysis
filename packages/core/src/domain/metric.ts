import { z } from 'zod';
import { INDUSTRY_CATEGORIES } from '../config/industries';
import { evidenceSchema, subjectSchema } from './shared';
import { SOURCE_TYPES } from './monitoring';

// The 10 fixed comparison dimensions (spec §2A). The list itself never changes; industry
// config only changes which metrics sit inside each one and how much each dimension weighs.
export const DIMENSION_KEYS = [
  'offerings',
  'pricing',
  'customer_experience',
  'reputation',
  'digital_presence',
  'marketing',
  'channels',
  'innovation',
  'growth',
  'trust',
] as const;
export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export const dimensionSchema = z.object({
  key: z.enum(DIMENSION_KEYS),
  name: z.string().min(1),
  defaultWeight: z.number().positive(),
});
export type Dimension = z.infer<typeof dimensionSchema>;

export const VALUE_TYPES = [
  'boolean',
  'number',
  'rating',
  'currency',
  'count',
  'duration',
  'text',
] as const;
export type ValueType = (typeof VALUE_TYPES)[number];

// MetricDefinition (spec §4). Built-in definitions live in code config, keyed by industry
// category (SYSTEM_DESIGN §5.2); only workspace-custom metrics are stored in the DB.
export const metricDefinitionSchema = z.object({
  id: z.string().min(1), // stable slug, e.g. "delivery_time" - not a uuid for built-ins
  dimensionKey: z.enum(DIMENSION_KEYS),
  name: z.string().trim().min(1).max(200),
  industryCategories: z.array(z.enum(INDUSTRY_CATEGORIES)).min(1),
  valueType: z.enum(VALUE_TYPES),
  higherIsBetter: z.boolean().optional(), // e.g. price: false, rating: true; omit if not orderable
  unit: z.string().trim().max(50).optional(),
  sourceTypes: z.array(z.enum(SOURCE_TYPES)).default([]),
});
export type MetricDefinition = z.infer<typeof metricDefinitionSchema>;

export const ORIGINS = ['auto_detected', 'user_entered'] as const;
export type Origin = (typeof ORIGINS)[number];

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

// MetricValue (spec §4): one value for one business (self or competitor), append-only -
// "current" is the latest by observedAt (SYSTEM_DESIGN §5.2). Unknown metrics are simply
// absent, never a zero/false row.
export const metricValueSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  metricId: z.string().min(1),
  subject: subjectSchema,
  value: z.unknown(), // shape depends on the metric's valueType
  origin: z.enum(ORIGINS),
  confidence: z.enum(CONFIDENCE_LEVELS),
  evidence: z.array(evidenceSchema).default([]),
  observedAt: z.date(),
});
export type MetricValue = z.infer<typeof metricValueSchema>;

export const COMPARISON_STATUSES = ['lagging', 'at_par', 'leading', 'unique', 'unknown'] as const;
export type ComparisonStatus = (typeof COMPARISON_STATUSES)[number];

// ComparisonResult (spec §4): computed by deterministic code (SYSTEM_DESIGN §7.1), never by the LLM.
export const comparisonResultSchema = z.object({
  workspaceId: z.uuid(),
  metricId: z.string().min(1),
  status: z.enum(COMPARISON_STATUSES),
  competitorsAhead: z.array(z.uuid()).default([]),
  competitorsBehind: z.array(z.uuid()).default([]),
  selfValue: z.unknown().optional(),
  competitorMedian: z.unknown().optional(),
  computedAt: z.date(),
});
export type ComparisonResult = z.infer<typeof comparisonResultSchema>;
