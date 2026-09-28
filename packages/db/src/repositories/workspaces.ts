import { and, desc, eq } from 'drizzle-orm';
import type { CreateWorkspaceInput } from '@cip/core';
import type { Database } from '../client';
import { workspaces, type Workspace } from '../schema';

export async function createWorkspace(
  db: Database,
  ownerId: string,
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const [row] = await db
    .insert(workspaces)
    .values({
      ownerId,
      name: input.name,
      industry: input.industry,
      industryCategory: input.industryCategory,
      region: input.region ?? null,
    })
    .returning();
  if (!row) throw new Error('Failed to create workspace');
  return row;
}

export function listWorkspacesForOwner(db: Database, ownerId: string): Promise<Workspace[]> {
  return db
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerId, ownerId))
    .orderBy(desc(workspaces.createdAt));
}

export async function getWorkspaceForOwner(
  db: Database,
  ownerId: string,
  workspaceId: string,
): Promise<Workspace | undefined> {
  const [row] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, ownerId)))
    .limit(1);
  return row;
}

// Not owner-scoped: for worker/system code operating on a workspace it already knows the id
// of (e.g. from a Source row), not on behalf of a signed-in user. Never expose this to apps/web.
export async function getWorkspace(
  db: Database,
  workspaceId: string,
): Promise<Workspace | undefined> {
  const [row] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  return row;
}
