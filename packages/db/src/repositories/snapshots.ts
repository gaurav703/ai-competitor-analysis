import { and, desc, eq, lt } from 'drizzle-orm';
import type { Database } from '../client';
import { type NewSnapshot, type Snapshot, snapshots } from '../schema';

export function createSnapshot(db: Database, input: NewSnapshot): Promise<Snapshot> {
  return db
    .insert(snapshots)
    .values(input)
    .returning()
    .then(([row]) => {
      if (!row) throw new Error('Failed to create snapshot');
      return row;
    });
}

// Used by feed-style adapters (google_news, play_store) to tell a new item from one already
// seen: each item's content hash becomes a Snapshot the first time it's encountered.
export async function snapshotHashExists(
  db: Database,
  sourceId: string,
  hash: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(and(eq(snapshots.sourceId, sourceId), eq(snapshots.hash, hash)))
    .limit(1);
  return !!row;
}

export function getSnapshot(db: Database, snapshotId: string): Promise<Snapshot | undefined> {
  return db
    .select()
    .from(snapshots)
    .where(eq(snapshots.id, snapshotId))
    .limit(1)
    .then(([row]) => row);
}

// The snapshot immediately before this one for the same source - the "old" side of the diff
// (SYSTEM_DESIGN §4.1: "Build diff old vs new"). undefined for a source's very first snapshot.
export function getPreviousSnapshot(
  db: Database,
  sourceId: string,
  beforeFetchedAt: Date,
): Promise<Snapshot | undefined> {
  return db
    .select()
    .from(snapshots)
    .where(and(eq(snapshots.sourceId, sourceId), lt(snapshots.fetchedAt, beforeFetchedAt)))
    .orderBy(desc(snapshots.fetchedAt))
    .limit(1)
    .then(([row]) => row);
}
