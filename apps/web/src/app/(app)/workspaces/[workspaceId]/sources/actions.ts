'use server';

import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { SOURCE_TYPES, type SourceType, type SubjectType } from '@cip/core';
import { createSource, getCompetitor, getWorkspaceForOwner } from '@cip/db';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export type CreateSourcesState = { error?: string } | undefined;

// F2: the user confirms/edits industry-suggested source types by filling in a URL for each one
// they want monitored - an empty field means "skip this suggestion". One action handles both
// competitor sources and the workspace's own (self) sources.
export async function createSourcesAction(
  workspaceId: string,
  subjectType: SubjectType,
  subjectId: string | undefined,
  redirectTo: string,
  _prev: CreateSourcesState,
  formData: FormData,
): Promise<CreateSourcesState> {
  const user = await requireUser();
  const db = getDb();
  const workspace = await getWorkspaceForOwner(db, user.id, workspaceId);
  if (!workspace) notFound();

  if (subjectType === 'competitor') {
    if (!subjectId) notFound();
    const competitor = await getCompetitor(db, workspaceId, subjectId);
    if (!competitor) notFound();
  }

  let createdCount = 0;
  for (const type of SOURCE_TYPES) {
    const raw = String(formData.get(`url__${type}`) ?? '').trim();
    if (!raw) continue;

    const parsed = z.url().safeParse(raw);
    if (!parsed.success) {
      return { error: `"${raw}" isn't a valid URL for ${type.replace(/_/g, ' ')}.` };
    }

    await createSource(db, {
      workspaceId,
      subjectType,
      subjectId: subjectType === 'competitor' ? subjectId : null,
      type: type as SourceType,
      url: parsed.data,
    });
    createdCount++;
  }

  if (createdCount === 0) {
    return { error: 'Add at least one source URL, or skip this for now.' };
  }

  redirect(redirectTo);
}
