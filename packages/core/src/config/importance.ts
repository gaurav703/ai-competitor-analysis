import { z } from 'zod';
import type { EventType, ImportanceLevel } from '../domain/event';
import { EVENT_TYPES } from '../domain/event';
import type { IndustryCategory } from './industries';
import { INDUSTRY_CATEGORIES } from './industries';

// Importance scoring (spec §5 F6, SYSTEM_DESIGN §8.1). Deterministic:
//   score = baseWeight[eventType] (+ industry override) + adjustments
//   level = score >= high ? 'high' : score >= medium ? 'medium' : 'low'
// The LLM never sets importance; it only supplies the event. `importanceReason` is assembled
// from whichever rules fired, in code.

const baseWeightSchema = z.record(z.enum(EVENT_TYPES), z.number());

export const EVENT_TYPE_BASE_WEIGHT: Record<EventType, number> = baseWeightSchema.parse({
  new_offering: 4,
  offering_removed: 3,
  pricing_change: 4,
  partnership: 3,
  expansion: 3,
  funding: 3,
  app_release: 2,
  offering_updated: 2,
  promotion: 2,
  marketing_campaign: 1,
  hiring: 1,
  review_trend: 2,
  leadership_change: 2,
  other: 1,
});

// Per-industry overrides layered on top of the base weight (F6: "weights can be adjusted per
// industry category"). Sparse on purpose - only list what differs from the base.
const industryOverridesSchema = z.partialRecord(
  z.enum(INDUSTRY_CATEGORIES),
  z.partialRecord(z.enum(EVENT_TYPES), z.number()),
);

export const EVENT_TYPE_WEIGHT_OVERRIDES: Partial<
  Record<IndustryCategory, Partial<Record<EventType, number>>>
> = industryOverridesSchema.parse({
  food_hospitality: { promotion: 3 }, // combos/offers matter more day-to-day for restaurants
  software: { app_release: 3, funding: 4 }, // releases and funding signal more for SaaS
});

export function getEventTypeWeight(type: EventType, industryCategory: IndustryCategory): number {
  return EVENT_TYPE_WEIGHT_OVERRIDES[industryCategory]?.[type] ?? EVENT_TYPE_BASE_WEIGHT[type];
}

// Score adjustments (SYSTEM_DESIGN §8.1) - added on top of the base/override weight above.
export const IMPORTANCE_ADJUSTMENTS = z
  .object({
    touchesOfferingUserLacks: z.number(),
    touchesOfferingUserHas: z.number(),
    partOfActivePattern: z.number(),
    inUserRegion: z.number(),
  })
  .parse({
    touchesOfferingUserLacks: 2,
    touchesOfferingUserHas: 1,
    partOfActivePattern: 1,
    inUserRegion: 1,
  });

export const IMPORTANCE_LEVEL_THRESHOLDS = z
  .object({ high: z.number(), medium: z.number() })
  .parse({ high: 6, medium: 3 });

export function importanceLevelForScore(score: number): ImportanceLevel {
  if (score >= IMPORTANCE_LEVEL_THRESHOLDS.high) return 'high';
  if (score >= IMPORTANCE_LEVEL_THRESHOLDS.medium) return 'medium';
  return 'low';
}
