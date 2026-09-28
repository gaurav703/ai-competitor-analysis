import type { EventType } from '../domain/event';
import { normalizeOfferingText } from '../offerings/match';
import { THRESHOLDS } from '../config/thresholds';

// Dedup key (spec §5 F5): competitor + type + normalized subject + time window. The same
// real-world development reported by several sources should collapse into one Event with
// several sourceIds, not one row per source.
export function buildDedupKey(params: {
  competitorId: string;
  type: EventType;
  subject: string; // the concrete thing this event is about - title, item name, partner, etc.
  occurredAt: Date;
}): string {
  const bucketMs = THRESHOLDS.dedupWindowHours * 60 * 60 * 1000;
  const windowBucket = Math.floor(params.occurredAt.getTime() / bucketMs);
  const normalizedSubject = normalizeOfferingText(params.subject);
  return `${params.competitorId}:${params.type}:${normalizedSubject}:${windowBucket}`;
}

// Similarity fallback for when the dedup key alone doesn't line up (spec §5: "plus similarity
// matching as a fallback") - e.g. two sources phrase the same subject slightly differently, or
// land in adjacent time buckets. Word-overlap over title+summary; embeddings (event.embedding)
// are deferred with the offering-matching pgvector tier (D-004).
function tokenize(text: string): Set<string> {
  return new Set(normalizeOfferingText(text).split(' ').filter(Boolean));
}

export function textSimilarity(
  a: { title: string; summary: string },
  b: { title: string; summary: string },
): number {
  const setA = tokenize(`${a.title} ${a.summary}`);
  const setB = tokenize(`${b.title} ${b.summary}`);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

// Two sources reporting the same real-world fact rarely share more than ~40-50% of their
// normalized words once names, dates and boilerplate vary - a tighter threshold missed
// genuine duplicates in practice (see dedup.test.ts for realistic paraphrase examples).
export const DEDUP_SIMILARITY_THRESHOLD = 0.4;

export function isLikelyDuplicate(
  candidate: { competitorId: string; type: EventType; title: string; summary: string },
  existing: { competitorId: string; type: EventType; title: string; summary: string },
): boolean {
  if (candidate.competitorId !== existing.competitorId || candidate.type !== existing.type)
    return false;
  return textSimilarity(candidate, existing) >= DEDUP_SIMILARITY_THRESHOLD;
}
