import type { IndustryCategory } from '../config/industries';
import {
  getEventTypeWeight,
  IMPORTANCE_ADJUSTMENTS,
  importanceLevelForScore,
} from '../config/importance';
import type { EventType, ImportanceLevel } from '../domain/event';

export type ImportanceContext = {
  industryCategory: IndustryCategory;
  userOfferingIds: Set<string>; // offerings the user's own business currently has
  isPartOfActivePattern?: boolean; // wired up once F10 (Phase 9) exists; false until then
  userRegion?: string;
  eventRegion?: string; // best-effort, e.g. from event.structured.location
};

export type ImportanceResult = { score: number; level: ImportanceLevel; reason: string };

function sameRegion(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  return na.length > 0 && (na === nb || na.includes(nb) || nb.includes(na));
}

// Importance scoring (spec §5 F6, SYSTEM_DESIGN §8.1) - deterministic, never decided by the
// LLM. `reason` is assembled from whichever rules actually fired, so every event's importance
// is explainable.
export function scoreImportance(
  event: { type: EventType; offeringsAffected: { id: string }[] },
  ctx: ImportanceContext,
): ImportanceResult {
  let score = getEventTypeWeight(event.type, ctx.industryCategory);
  const reasons: string[] = [`${event.type.replace(/_/g, ' ')} event`];

  if (event.offeringsAffected.length > 0) {
    const touchesLacking = event.offeringsAffected.some((o) => !ctx.userOfferingIds.has(o.id));
    const touchesHas = event.offeringsAffected.some((o) => ctx.userOfferingIds.has(o.id));
    if (touchesLacking) {
      score += IMPORTANCE_ADJUSTMENTS.touchesOfferingUserLacks;
      reasons.push("touches an offering you don't have");
    } else if (touchesHas) {
      score += IMPORTANCE_ADJUSTMENTS.touchesOfferingUserHas;
      reasons.push('touches an offering you also have');
    }
  }

  if (ctx.isPartOfActivePattern) {
    score += IMPORTANCE_ADJUSTMENTS.partOfActivePattern;
    reasons.push('part of a pattern across competitors');
  }

  if (ctx.userRegion && ctx.eventRegion && sameRegion(ctx.userRegion, ctx.eventRegion)) {
    score += IMPORTANCE_ADJUSTMENTS.inUserRegion;
    reasons.push('in your region');
  }

  return { score, level: importanceLevelForScore(score), reason: reasons.join('; ') };
}
