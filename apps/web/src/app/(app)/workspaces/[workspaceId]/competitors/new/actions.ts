'use server';

import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { competitorInputSchema } from '@cip/core';
import { createCompetitor, getWorkspaceForOwner } from '@cip/db';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export type CreateCompetitorState =
  | {
      error?: string;
      fieldErrors?: Partial<Record<'name' | 'website', string>>;
      values?: Record<string, string>;
    }
  | undefined;

export async function createCompetitorAction(
  workspaceId: string,
  _prev: CreateCompetitorState,
  formData: FormData,
): Promise<CreateCompetitorState> {
  const user = await requireUser();
  const db = getDb();
  const workspace = await getWorkspaceForOwner(db, user.id, workspaceId);
  if (!workspace) notFound();

  const values = {
    name: String(formData.get('name') ?? ''),
    website: String(formData.get('website') ?? ''),
  };

  const parsed = competitorInputSchema.safeParse({
    name: values.name,
    website: values.website ? values.website : undefined,
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      values,
      fieldErrors: { name: fieldErrors.name?.[0], website: fieldErrors.website?.[0] },
    };
  }

  let competitorId: string;
  try {
    const competitor = await createCompetitor(db, workspaceId, parsed.data);
    competitorId = competitor.id;
  } catch (err) {
    console.error('createCompetitor failed', err);
    return { values, error: 'Could not add the competitor. Please try again.' };
  }

  redirect(`/workspaces/${workspaceId}/competitors/${competitorId}`);
}
