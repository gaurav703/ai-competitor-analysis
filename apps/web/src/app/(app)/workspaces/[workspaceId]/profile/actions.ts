'use server';

import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { businessProfileSchema, type BusinessProfile } from '@cip/core';
import {
  businessProfileDraftSchema,
  buildExtractProfilePrompt,
  callLlmStructured,
  EXTRACT_PROFILE_PROMPT_VERSION,
  type BusinessProfileDraft,
} from '@cip/prompts';
import {
  createOffering,
  createPriceEntry,
  getWorkspaceForOwner,
  saveBusinessProfile,
} from '@cip/db';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { fetchWebsiteText } from '@/lib/fetchWebsiteText';
import { createLlmDeps } from '@/lib/llm';

export type ExtractProfileState =
  | {
      error?: string;
      draft?: BusinessProfileDraft;
      values?: { website?: string; description?: string };
    }
  | undefined;

export async function extractProfileAction(
  workspaceId: string,
  _prev: ExtractProfileState,
  formData: FormData,
): Promise<ExtractProfileState> {
  const user = await requireUser();
  const db = getDb();
  const workspace = await getWorkspaceForOwner(db, user.id, workspaceId);
  if (!workspace) notFound();

  const website = String(formData.get('website') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const values = { website, description };

  if (description.length < 1) {
    return { values, error: 'Describe your business in a sentence or two.' };
  }

  const websiteText = website ? await fetchWebsiteText(website) : undefined;
  const { systemPrompt, userPrompt } = buildExtractProfilePrompt({
    industry: workspace.industry,
    userDescription: description,
    websiteText,
  });

  const draft = await callLlmStructured(createLlmDeps(), {
    task: 'extractProfile',
    promptVersion: EXTRACT_PROFILE_PROMPT_VERSION,
    systemPrompt,
    userPrompt,
    schema: businessProfileDraftSchema,
    loggedInput: { workspaceId, website, description },
    // Not cached: every business's own description is different, so a hash-keyed cache would
    // basically never hit - the point of caching is reuse across repeated identical diffs.
  });

  if (!draft) {
    return {
      values,
      error: 'Could not extract a profile right now. You can still fill it in manually below.',
      draft: { description, offerings: [], pricing: [], targetCustomers: undefined },
    };
  }

  return { values, draft };
}

export type SaveProfileState = { error?: string } | undefined;

// Draft offerings/pricing are edited as plain text (one line each) rather than a fully dynamic
// add/remove form - simpler to build and just as editable. Parsed back into structured data here.
function parseOfferingsText(text: string): { name: string; category: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, category] = line.split('|').map((s) => s.trim());
      return { name: name || line, category: category || 'General' };
    });
}

function parsePricingText(text: string): {
  label: string;
  amount: number;
  currency: string;
  unit?: string;
}[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [label, amountStr, currency, unit] = line.split('|').map((s) => s.trim());
      const amount = Number(amountStr);
      if (!label || !currency || Number.isNaN(amount)) return [];
      return [{ label, amount, currency: currency.toUpperCase(), unit: unit || undefined }];
    });
}

export async function saveProfileAction(
  workspaceId: string,
  _prev: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  const user = await requireUser();
  const db = getDb();
  const workspace = await getWorkspaceForOwner(db, user.id, workspaceId);
  if (!workspace) notFound();

  const description = String(formData.get('description') ?? '').trim();
  const offeringsText = String(formData.get('offerings') ?? '');
  const pricingText = String(formData.get('pricing') ?? '');
  const targetCustomers = String(formData.get('targetCustomers') ?? '').trim();
  const website = String(formData.get('website') ?? '').trim();

  const offeringDrafts = parseOfferingsText(offeringsText);
  // Each draft offering becomes a real Offering row - the user's own first-declared offerings,
  // so there's nothing to alias-match against yet (unlike mapOfferingMention in Phase 4, which
  // matches competitor mentions against an existing taxonomy).
  const offerings = await Promise.all(
    offeringDrafts.map(async (o) => {
      const created = await createOffering(db, { workspaceId, name: o.name, category: o.category });
      return { id: created.id, name: created.name };
    }),
  );

  // Real price_entries rows are the source of truth (F8's price comparison queries this
  // table, scoped by subjectType/subjectId) - businessProfile.pricing below just mirrors them
  // for convenience display on the profile itself.
  const pricingRows = await Promise.all(
    parsePricingText(pricingText).map((p) =>
      createPriceEntry(db, {
        workspaceId,
        subjectType: 'self',
        label: p.label,
        amount: p.amount.toFixed(2),
        currency: p.currency,
        unit: p.unit,
        observedAt: new Date(),
      }),
    ),
  );

  const profile: BusinessProfile = {
    description,
    offerings,
    pricing: pricingRows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      subjectType: 'self' as const,
      label: row.label,
      amount: Number(row.amount),
      currency: row.currency,
      unit: row.unit ?? undefined,
      observedAt: row.observedAt,
    })),
    targetCustomers: targetCustomers || undefined,
    sourceUrls: website ? [website] : [],
  };

  const parsed = businessProfileSchema.safeParse(profile);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { error: Object.values(fieldErrors).flat()[0] ?? 'Could not save the profile.' };
  }

  await saveBusinessProfile(db, user.id, workspaceId, parsed.data);
  redirect(`/workspaces/${workspaceId}`);
}
