import { z } from 'zod';

// Who a value, price or metric belongs to: the user's own business or one competitor.
export const SUBJECT_TYPES = ['self', 'competitor'] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export const subjectSchema = z.object({
  type: z.enum(SUBJECT_TYPES),
  // Required when type = 'competitor'; absent/ignored for 'self'.
  id: z.uuid().optional(),
});
export type Subject = z.infer<typeof subjectSchema>;

// A pointer back to proof (spec §4, used by MetricValue, LagItem, StrengthItem).
export const evidenceSchema = z.object({
  sourceId: z.uuid(),
  snapshotId: z.uuid().optional(),
  excerpt: z.string().max(2000).optional(),
});
export type Evidence = z.infer<typeof evidenceSchema>;

// Lightweight pointer to a canonical Offering, used inside BusinessProfile/Competitor/Event payloads
// instead of embedding the full row.
export const offeringRefSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});
export type OfferingRef = z.infer<typeof offeringRefSchema>;
