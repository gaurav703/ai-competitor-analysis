import { z } from 'zod';
import {
  buildDedupKey,
  isLikelyDuplicate,
  offeringRefSchema,
  scoreImportance,
  THRESHOLDS,
} from '@cip/core';
import type { Database } from '@cip/db';
import {
  createEvent,
  getEventByDedupKey,
  getWorkspace,
  linkEvidence,
  listRecentEventsForCompetitorType,
} from '@cip/db';
import type { Logger } from 'pino';
import { extractedEventSchema } from '@cip/prompts';

// Job data crosses Redis (serialized JSON), so the compile-time type from extractEvents.ts
// gives no runtime guarantee by the time process-event consumes it - validated again here,
// same as any other untrusted input (CLAUDE.md: every stored/queued payload is Zod-checked).
export const processEventCandidateSchema = extractedEventSchema.extend({
  sourceIds: z.array(z.uuid()).min(1),
  snapshotIds: z.array(z.uuid()),
  offeringsAffected: z.array(offeringRefSchema),
});
export type ProcessEventCandidate = z.infer<typeof processEventCandidateSchema>;

export type ProcessEventResult =
  | { outcome: 'merged'; eventId: string }
  | { outcome: 'created'; eventId: string; importance: string };

// process-event (spec §5 F5/F6, SYSTEM_DESIGN §4.1): dedup a candidate event into an existing
// row or insert a new one, then score importance. One real-world development ends up as one
// Event with every source that reported it; every Event carries importance + a reason.
export async function runProcessEvent(
  db: Database,
  logger: Logger,
  workspaceId: string,
  competitorId: string,
  candidate: ProcessEventCandidate,
): Promise<ProcessEventResult> {
  const occurredAt = candidate.occurredAt ? new Date(candidate.occurredAt) : new Date();
  const subject = candidate.structured.item ? String(candidate.structured.item) : candidate.title;
  const dedupKey = buildDedupKey({ competitorId, type: candidate.type, subject, occurredAt });

  const exact = await getEventByDedupKey(db, workspaceId, dedupKey);
  if (exact) {
    await linkEvidence(
      db,
      exact.id,
      candidate.sourceIds,
      candidate.snapshotIds,
      candidate.offeringsAffected.map((o) => o.id),
    );
    return { outcome: 'merged', eventId: exact.id };
  }

  const since = new Date(Date.now() - THRESHOLDS.dedupWindowHours * 60 * 60 * 1000);
  const recent = await listRecentEventsForCompetitorType(db, competitorId, candidate.type, since);
  const similar = recent.find((e) => isLikelyDuplicate({ ...candidate, competitorId }, e));
  if (similar) {
    await linkEvidence(
      db,
      similar.id,
      candidate.sourceIds,
      candidate.snapshotIds,
      candidate.offeringsAffected.map((o) => o.id),
    );
    return { outcome: 'merged', eventId: similar.id };
  }

  const workspace = await getWorkspace(db, workspaceId);
  if (!workspace) throw new Error(`process-event: workspace ${workspaceId} not found`);

  const userOfferingIds = new Set((workspace.businessProfile?.offerings ?? []).map((o) => o.id));
  const eventRegion =
    typeof candidate.structured.location === 'string' ? candidate.structured.location : undefined;

  const { score, level, reason } = scoreImportance(candidate, {
    industryCategory: workspace.industryCategory,
    userOfferingIds,
    userRegion: workspace.region ?? undefined,
    eventRegion,
  });

  const created = await createEvent(db, {
    workspaceId,
    competitorId,
    type: candidate.type,
    title: candidate.title,
    summary: candidate.summary,
    structured: candidate.structured,
    importance: level,
    importanceReason: reason,
    dedupKey,
    occurredAt: candidate.occurredAt ? occurredAt : undefined,
    sourceIds: candidate.sourceIds,
    snapshotIds: candidate.snapshotIds,
    offeringIds: candidate.offeringsAffected.map((o) => o.id),
  });

  logger.info({ eventId: created.id, importance: level, score }, 'event created');
  // send-alert (F12) and recompute-comparison (F9) are later phases (10 and 8) - `high`
  // events just get logged for now rather than silently doing nothing.
  if (level === 'high')
    logger.info({ eventId: created.id }, 'high-importance event (alerts land in Phase 10)');

  return { outcome: 'created', eventId: created.id, importance: level };
}
