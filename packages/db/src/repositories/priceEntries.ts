import { desc, eq } from 'drizzle-orm';
import type { Database } from '../client';
import {
  competitors,
  type NewPriceEntry,
  offerings,
  type PriceEntry,
  priceEntries,
} from '../schema';
import { getWorkspace } from './workspaces';

export function createPriceEntry(db: Database, input: NewPriceEntry): Promise<PriceEntry> {
  return db
    .insert(priceEntries)
    .values(input)
    .returning()
    .then(([row]) => {
      if (!row) throw new Error('Failed to create price entry');
      return row;
    });
}

export function listPriceEntries(db: Database, workspaceId: string): Promise<PriceEntry[]> {
  return db.select().from(priceEntries).where(eq(priceEntries.workspaceId, workspaceId));
}

export type PricePositionEntry = {
  subjectType: 'self' | 'competitor';
  subjectId: string | null;
  subjectName: string;
  label: string;
  amount: string;
  currency: string;
  unit: string | null;
  observedAt: Date;
};

export type PricePosition = {
  offeringId: string | null; // null groups entries not tied to a specific offering
  offeringName: string | null;
  entries: PricePositionEntry[];
};

// Price position map (spec §5 F8): equivalent offerings side by side, currency/unit as
// recorded (no FX conversion in MVP - spec §9 flags cross-currency comparison as a hard
// problem to be precise about rather than silently converting). Only the latest price per
// subject per offering is shown - price_entries is append-only history, like MetricValue.
export async function getPricePositions(
  db: Database,
  workspaceId: string,
): Promise<PricePosition[]> {
  const [entryRows, competitorRows, offeringRows, workspace] = await Promise.all([
    db
      .select()
      .from(priceEntries)
      .where(eq(priceEntries.workspaceId, workspaceId))
      .orderBy(desc(priceEntries.observedAt)),
    db.select().from(competitors).where(eq(competitors.workspaceId, workspaceId)),
    db.select().from(offerings).where(eq(offerings.workspaceId, workspaceId)),
    getWorkspace(db, workspaceId),
  ]);

  const competitorNames = new Map(competitorRows.map((c) => [c.id, c.name] as const));
  const offeringNames = new Map(offeringRows.map((o) => [o.id, o.name] as const));

  // Latest entry per (offeringId, subjectType, subjectId) - dedupe now that entryRows is
  // sorted newest-first.
  const seen = new Set<string>();
  const latestEntries: typeof entryRows = [];
  for (const row of entryRows) {
    const key = `${row.offeringId ?? 'none'}:${row.subjectType}:${row.subjectId ?? 'self'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latestEntries.push(row);
  }

  const positions = new Map<string, PricePosition>();
  for (const row of latestEntries) {
    const groupKey = row.offeringId ?? 'ungrouped';
    let position = positions.get(groupKey);
    if (!position) {
      position = {
        offeringId: row.offeringId,
        offeringName: row.offeringId ? (offeringNames.get(row.offeringId) ?? null) : null,
        entries: [],
      };
      positions.set(groupKey, position);
    }
    position.entries.push({
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      subjectName:
        row.subjectType === 'self'
          ? (workspace?.name ?? 'You')
          : (row.subjectId && competitorNames.get(row.subjectId)) || 'Unknown competitor',
      label: row.label,
      amount: row.amount,
      currency: row.currency,
      unit: row.unit,
      observedAt: row.observedAt,
    });
  }

  return [...positions.values()];
}
