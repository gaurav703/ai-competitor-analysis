import { and, desc, eq, gte } from 'drizzle-orm';
import type { EventType, ImportanceLevel } from '@cip/core';
import type { Database } from '../client';
import {
  type Event,
  eventOfferings,
  events,
  eventSnapshots,
  eventSources,
  snapshots,
  sources,
} from '../schema';

export type NewCandidateEvent = {
  workspaceId: string;
  competitorId: string;
  type: EventType;
  title: string;
  summary: string;
  structured: Record<string, unknown>;
  importance: ImportanceLevel;
  importanceReason: string;
  dedupKey: string;
  occurredAt?: Date;
  sourceIds: string[];
  snapshotIds: string[];
  offeringIds: string[];
};

export async function createEvent(db: Database, input: NewCandidateEvent): Promise<Event> {
  const [row] = await db
    .insert(events)
    .values({
      workspaceId: input.workspaceId,
      competitorId: input.competitorId,
      type: input.type,
      title: input.title,
      summary: input.summary,
      structured: input.structured,
      importance: input.importance,
      importanceReason: input.importanceReason,
      dedupKey: input.dedupKey,
      occurredAt: input.occurredAt,
    })
    .returning();
  if (!row) throw new Error('Failed to create event');

  await linkEvidence(db, row.id, input.sourceIds, input.snapshotIds, input.offeringIds);
  return row;
}

// Dedup merge (spec §5 F5): the same development, seen again from another source, adds its
// evidence to the existing Event instead of creating a new row.
export async function linkEvidence(
  db: Database,
  eventId: string,
  sourceIds: string[],
  snapshotIds: string[],
  offeringIds: string[],
): Promise<void> {
  if (sourceIds.length > 0) {
    await db
      .insert(eventSources)
      .values(sourceIds.map((sourceId) => ({ eventId, sourceId })))
      .onConflictDoNothing();
  }
  if (snapshotIds.length > 0) {
    await db
      .insert(eventSnapshots)
      .values(snapshotIds.map((snapshotId) => ({ eventId, snapshotId })))
      .onConflictDoNothing();
  }
  if (offeringIds.length > 0) {
    await db
      .insert(eventOfferings)
      .values(offeringIds.map((offeringId) => ({ eventId, offeringId })))
      .onConflictDoNothing();
  }
}

export async function getEventByDedupKey(
  db: Database,
  workspaceId: string,
  dedupKey: string,
): Promise<Event | undefined> {
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.workspaceId, workspaceId), eq(events.dedupKey, dedupKey)))
    .limit(1);
  return row;
}

// Candidates for the similarity-fallback dedup check (spec §5): recent events for the same
// competitor and type, newest first.
export function listRecentEventsForCompetitorType(
  db: Database,
  competitorId: string,
  type: EventType,
  since: Date,
): Promise<Event[]> {
  return db
    .select()
    .from(events)
    .where(
      and(
        eq(events.competitorId, competitorId),
        eq(events.type, type),
        gte(events.detectedAt, since),
      ),
    )
    .orderBy(desc(events.detectedAt));
}

export type TimelineEvent = Event & {
  evidence: {
    sourceId: string;
    sourceUrl: string;
    sourceType: string;
    snapshotExcerpt: string | null;
  }[];
};

// Competitor timeline (spec §5 F7): reverse-chronological, with the evidence behind each event
// (source URL + a snapshot excerpt) resolved alongside it.
export async function listEventsForCompetitor(
  db: Database,
  workspaceId: string,
  competitorId: string,
  filter: { type?: EventType; importance?: ImportanceLevel } = {},
): Promise<TimelineEvent[]> {
  const conditions = [eq(events.workspaceId, workspaceId), eq(events.competitorId, competitorId)];
  if (filter.type) conditions.push(eq(events.type, filter.type));
  if (filter.importance) conditions.push(eq(events.importance, filter.importance));

  const rows = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.detectedAt));

  const withEvidence = await Promise.all(
    rows.map(async (row) => {
      const evidence = await db
        .select({
          sourceId: sources.id,
          sourceUrl: sources.url,
          sourceType: sources.type,
          snapshotExcerpt: snapshots.content,
        })
        .from(eventSources)
        .innerJoin(sources, eq(eventSources.sourceId, sources.id))
        .leftJoin(eventSnapshots, eq(eventSnapshots.eventId, eventSources.eventId))
        .leftJoin(snapshots, eq(eventSnapshots.snapshotId, snapshots.id))
        .where(eq(eventSources.eventId, row.id));

      return {
        ...row,
        evidence: evidence.map((e) => ({
          ...e,
          snapshotExcerpt: e.snapshotExcerpt ? e.snapshotExcerpt.slice(0, 300) : null,
        })),
      };
    }),
  );

  return withEvidence;
}
