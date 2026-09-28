import { eq, sql } from 'drizzle-orm';
import type { Database } from '../client';
import { type NewOffering, type Offering, offerings } from '../schema';

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
