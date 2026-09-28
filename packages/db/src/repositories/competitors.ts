import { and, eq } from 'drizzle-orm';
import type { CompetitorInput } from '@cip/core';
import type { Database } from '../client';
import { type Competitor, competitors } from '../schema';

export function createCompetitor(
  db: Database,
  workspaceId: string,
  input: CompetitorInput,
): Promise<Competitor> {
  return db
    .insert(competitors)
    .values({
      workspaceId,
      name: input.name,
      website: input.website ?? null,
      locations: input.locations ?? null,
    })
    .returning()
    .then(([row]) => {
      if (!row) throw new Error('Failed to create competitor');
      return row;
    });
}

export function listCompetitors(db: Database, workspaceId: string): Promise<Competitor[]> {
  return db.select().from(competitors).where(eq(competitors.workspaceId, workspaceId));
}

export function getCompetitor(
  db: Database,
  workspaceId: string,
  competitorId: string,
): Promise<Competitor | undefined> {
  return db
    .select()
    .from(competitors)
    .where(and(eq(competitors.id, competitorId), eq(competitors.workspaceId, workspaceId)))
    .limit(1)
    .then(([row]) => row);
}
