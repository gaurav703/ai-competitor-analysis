import { eq } from 'drizzle-orm';
import { THRESHOLDS } from '@cip/core';
import type { Database } from '../client';
import { type NewSource, type Source, sources } from '../schema';

export function listActiveSources(db: Database): Promise<Source[]> {
  return db.select().from(sources).where(eq(sources.status, 'active'));
}

export function createSource(db: Database, input: NewSource): Promise<Source> {
  return db
    .insert(sources)
    .values(input)
    .returning()
    .then(([row]) => {
      if (!row) throw new Error('Failed to create source');
      return row;
    });
}

// Website-style confirmed change: a new Snapshot was stored, lastHash advances, and any
// pending (unconfirmed) hash is cleared. Also resets the error streak - a successful fetch
// is what brings an `unhealthy` source back to `active` (SYSTEM_DESIGN §13 reliability).
export async function recordSourceFetchSuccess(
  db: Database,
  sourceId: string,
  changes: { lastHash?: string | null; pendingHash?: string | null },
): Promise<void> {
  await db
    .update(sources)
    .set({
      lastFetchedAt: new Date(),
      errorCount: 0,
      status: 'active',
      ...changes,
    })
    .where(eq(sources.id, sourceId));
}

export async function recordSourceFetchError(db: Database, sourceId: string): Promise<void> {
  const [row] = await db
    .select({ errorCount: sources.errorCount })
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);
  const nextCount = (row?.errorCount ?? 0) + 1;

  await db
    .update(sources)
    .set({
      lastFetchedAt: new Date(),
      errorCount: nextCount,
      status: nextCount >= THRESHOLDS.sourceUnhealthyAfterFailures ? 'unhealthy' : 'active',
    })
    .where(eq(sources.id, sourceId));
}

export function getSource(db: Database, sourceId: string): Promise<Source | undefined> {
  return db
    .select()
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1)
    .then(([row]) => row);
}
