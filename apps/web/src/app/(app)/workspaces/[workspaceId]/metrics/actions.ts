'use server';

import { notFound, redirect } from 'next/navigation';
import { getMetricDefinitions } from '@cip/core';
import { createMetricValue, getWorkspaceForOwner } from '@cip/db';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export type SaveMetricsState = { error?: string } | undefined;

// F9 (first part): the user fills in or corrects their own metric values. Every value stores
// origin/confidence/evidence (spec §4); user-entered values get 'high' confidence since
// there's no extraction uncertainty - the user is stating it directly.
export async function saveMetricsAction(
  workspaceId: string,
  _prev: SaveMetricsState,
  formData: FormData,
): Promise<SaveMetricsState> {
  const user = await requireUser();
  const db = getDb();
  const workspace = await getWorkspaceForOwner(db, user.id, workspaceId);
  if (!workspace) notFound();

  const definitions = getMetricDefinitions(workspace.industryCategory);
  let savedCount = 0;

  for (const def of definitions) {
    const raw = formData.get(`metric__${def.id}`);
    if (raw === null) continue;

    let value: unknown;
    if (def.valueType === 'boolean') {
      // A tri-state <select> ("", "true", "false"), not a checkbox - an unchecked checkbox is
      // indistinguishable from "the user never looked at this field", and defaulting that to
      // false would be exactly the guessing spec §9 forbids ("unknown metrics stay unknown").
      const text = String(raw);
      if (text === '') continue;
      value = text === 'true';
    } else if (['number', 'rating', 'currency', 'count', 'duration'].includes(def.valueType)) {
      const text = String(raw).trim();
      if (text === '') continue; // left blank - skip, don't overwrite with a guess
      const num = Number(text);
      if (Number.isNaN(num)) return { error: `"${text}" isn't a number for ${def.name}.` };
      value = num;
    } else {
      const text = String(raw).trim();
      if (text === '') continue;
      value = text;
    }

    await createMetricValue(db, {
      workspaceId,
      metricId: def.id,
      subjectType: 'self',
      value,
      origin: 'user_entered',
      confidence: 'high',
    });
    savedCount++;
  }

  if (savedCount > 0) redirect(`/workspaces/${workspaceId}/metrics?saved=1`);
  return { error: 'No changes to save - fields are only saved when they have a value.' };
}
