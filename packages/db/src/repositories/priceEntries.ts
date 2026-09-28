import { eq } from 'drizzle-orm';
import type { Database } from '../client';
import { type NewPriceEntry, type PriceEntry, priceEntries } from '../schema';

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
