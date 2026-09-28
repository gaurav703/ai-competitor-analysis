import { z } from 'zod';
import { offeringRefSchema } from './shared';

// Event (spec §4). type-specific fields live in `structured` (Phase 4 defines the per-type
// shape and Zod-validates LLM output against it); this schema covers the fields common to
// every event.
export const EVENT_TYPES = [
  'new_offering',
  'offering_removed',
  'offering_updated',
  'pricing_change',
  'promotion',
  'partnership',
  'expansion',
  'funding',
  'hiring',
  'app_release',
  'review_trend',
  'marketing_campaign',
  'leadership_change',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const IMPORTANCE_LEVELS = ['low', 'medium', 'high'] as const;
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];

export const eventSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  competitorId: z.uuid(),
  sourceIds: z.array(z.uuid()).min(1),
  snapshotIds: z.array(z.uuid()).default([]),
  type: z.enum(EVENT_TYPES),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().min(1).max(2000),
  structured: z.record(z.string(), z.unknown()).default({}),
  offeringsAffected: z.array(offeringRefSchema).default([]),
  importance: z.enum(IMPORTANCE_LEVELS),
  importanceReason: z.string().trim().min(1).max(500),
  occurredAt: z.date().optional(), // not always knowable precisely
  detectedAt: z.date(),
  dedupKey: z.string().min(1),
  promptVersion: z.string().optional(), // absent only for non-LLM/manual events
});
export type Event = z.infer<typeof eventSchema>;
