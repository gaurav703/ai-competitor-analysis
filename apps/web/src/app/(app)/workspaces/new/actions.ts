'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createWorkspaceInputSchema } from '@cip/core';
import { createWorkspace } from '@cip/db';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export type CreateWorkspaceState =
  | {
      error?: string;
      fieldErrors?: Partial<Record<'name' | 'industry' | 'industryCategory' | 'region', string>>;
      values?: Record<string, string>;
    }
  | undefined;

export async function createWorkspaceAction(
  _prev: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const user = await requireUser();

  const values = {
    name: String(formData.get('name') ?? ''),
    industry: String(formData.get('industry') ?? ''),
    industryCategory: String(formData.get('industryCategory') ?? ''),
    region: String(formData.get('region') ?? ''),
  };

  const parsed = createWorkspaceInputSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      values,
      fieldErrors: {
        name: fieldErrors.name?.[0],
        industry: fieldErrors.industry?.[0],
        industryCategory: fieldErrors.industryCategory?.[0] && 'Choose a category',
        region: fieldErrors.region?.[0],
      },
    };
  }

  let workspaceId: string;
  try {
    const workspace = await createWorkspace(getDb(), user.id, parsed.data);
    workspaceId = workspace.id;
  } catch (err) {
    console.error('createWorkspace failed', err);
    return { values, error: 'Could not create the workspace. Please try again.' };
  }

  redirect(`/workspaces/${workspaceId}`);
}
