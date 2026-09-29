import { eq, sql } from 'drizzle-orm';
import type { EventType } from '@cip/core';
import type { Database } from '../client';
import {
  type Competitor,
  competitors,
  eventOfferings,
  events,
  eventSources,
  type NewOffering,
  type Offering,
  offerings,
  sources,
} from '../schema';
import { getWorkspace } from './workspaces';

export function listOfferings(db: Database, workspaceId: string): Promise<Offering[]> {
  return db.select().from(offerings).where(eq(offerings.workspaceId, workspaceId));
}

export function createOffering(db: Database, input: NewOffering): Promise<Offering> {
  return db
    .insert(offerings)
    .values(input)
    .returning()
    .then(([row]) => {
      if (!row) throw new Error('Failed to create offering');
      return row;
    });
}

// Adds a mention as a new alias, deduped, so the same phrasing is recognized by an exact
// alias match next time (spec §9: "user corrections feeding aliases" - this is the automatic
// counterpart, run after an LLM match confirms two mentions are the same offering).
export async function addOfferingAlias(
  db: Database,
  offeringId: string,
  alias: string,
): Promise<void> {
  await db
    .update(offerings)
    .set({
      aliases: sql`case when ${offerings.aliases} @> array[${alias}::text]
        then ${offerings.aliases}
        else array_append(${offerings.aliases}, ${alias})
      end`,
    })
    .where(eq(offerings.id, offeringId));
}

export type OfferingMatrixStatus = 'yes' | 'no' | 'unknown';

export type OfferingMatrixEvidence = {
  sourceId: string;
  sourceUrl: string;
  eventId: string;
  eventTitle: string;
};

export type OfferingMatrixCell = {
  status: OfferingMatrixStatus;
  evidence: OfferingMatrixEvidence[];
};

export type OfferingMatrixRow = {
  offering: Offering;
  self: OfferingMatrixCell;
  byCompetitor: Record<string, OfferingMatrixCell>;
};

// Offering matrix (spec §5 F8): yes / no / unknown, every "yes" (and "no") traceable to
// evidence. "No" for a competitor only when the LATEST event touching that offering for them
// is `offering_removed` - absence of monitoring evidence is 'unknown', never assumed 'no'
// (spec §9: unknown metrics stay unknown, never guessed).
export async function getOfferingMatrix(
  db: Database,
  workspaceId: string,
): Promise<{ competitors: Competitor[]; rows: OfferingMatrixRow[] }> {
  const [offeringRows, competitorRows, workspace] = await Promise.all([
    db.select().from(offerings).where(eq(offerings.workspaceId, workspaceId)),
    db.select().from(competitors).where(eq(competitors.workspaceId, workspaceId)),
    getWorkspace(db, workspaceId),
  ]);

  const evidenceRows = await db
    .select({
      offeringId: eventOfferings.offeringId,
      competitorId: events.competitorId,
      eventId: events.id,
      eventTitle: events.title,
      eventType: events.type,
      detectedAt: events.detectedAt,
      sourceId: sources.id,
      sourceUrl: sources.url,
    })
    .from(eventOfferings)
    .innerJoin(events, eq(eventOfferings.eventId, events.id))
    .innerJoin(eventSources, eq(eventSources.eventId, events.id))
    .innerJoin(sources, eq(eventSources.sourceId, sources.id))
    .where(eq(events.workspaceId, workspaceId));

  type EvidenceRow = (typeof evidenceRows)[number];
  const byPair = new Map<string, EvidenceRow[]>();
  for (const row of evidenceRows) {
    const key = `${row.offeringId}:${row.competitorId}`;
    const bucket = byPair.get(key);
    if (bucket) bucket.push(row);
    else byPair.set(key, [row]);
  }

  const ownedOfferingIds = new Set((workspace?.businessProfile?.offerings ?? []).map((o) => o.id));
  const hasProfile = !!workspace?.businessProfile;

  const rows: OfferingMatrixRow[] = offeringRows.map((offering) => {
    const self: OfferingMatrixCell = hasProfile
      ? { status: ownedOfferingIds.has(offering.id) ? 'yes' : 'no', evidence: [] }
      : { status: 'unknown', evidence: [] };

    const byCompetitor: Record<string, OfferingMatrixCell> = {};
    for (const competitor of competitorRows) {
      const pairRows = byPair.get(`${offering.id}:${competitor.id}`) ?? [];
      if (pairRows.length === 0) {
        byCompetitor[competitor.id] = { status: 'unknown', evidence: [] };
        continue;
      }
      const latest = [...pairRows].sort(
        (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime(),
      )[0]!;
      const status: OfferingMatrixStatus =
        (latest.eventType as EventType) === 'offering_removed' ? 'no' : 'yes';
      const seenSources = new Set<string>();
      const evidence: OfferingMatrixEvidence[] = [];
      for (const r of pairRows) {
        if (seenSources.has(r.sourceId)) continue;
        seenSources.add(r.sourceId);
        evidence.push({
          sourceId: r.sourceId,
          sourceUrl: r.sourceUrl,
          eventId: r.eventId,
          eventTitle: r.eventTitle,
        });
      }
      byCompetitor[competitor.id] = { status, evidence };
    }

    return { offering, self, byCompetitor };
  });

  return { competitors: competitorRows, rows };
}
