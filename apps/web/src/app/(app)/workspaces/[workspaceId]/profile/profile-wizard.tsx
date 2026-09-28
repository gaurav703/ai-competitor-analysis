'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  extractProfileAction,
  saveProfileAction,
  type ExtractProfileState,
  type SaveProfileState,
} from './actions';

function offeringsToText(offerings: { name: string; category: string }[]): string {
  return offerings.map((o) => `${o.name} | ${o.category}`).join('\n');
}

function pricingToText(
  pricing: { label: string; amount: number; currency: string; unit?: string }[],
): string {
  return pricing
    .map((p) => `${p.label} | ${p.amount} | ${p.currency} | ${p.unit ?? ''}`)
    .join('\n');
}

export function ProfileWizard({
  workspaceId,
  industry,
}: {
  workspaceId: string;
  industry: string;
}) {
  const boundExtract = extractProfileAction.bind(null, workspaceId);
  const [extractState, extractAction, extracting] = useActionState<ExtractProfileState, FormData>(
    boundExtract,
    undefined,
  );

  const boundSave = saveProfileAction.bind(null, workspaceId);
  const [saveState, saveAction, saving] = useActionState<SaveProfileState, FormData>(
    boundSave,
    undefined,
  );

  if (!extractState?.draft) {
    return (
      <Card>
        <form action={extractAction} className="space-y-4">
          <Field
            label="Website (optional)"
            htmlFor="website"
            hint={`We'll pull text from the homepage to help extract your profile.`}
          >
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://example.com"
              defaultValue={extractState?.values?.website}
            />
          </Field>
          <Field
            label="Describe your business"
            htmlFor="description"
            hint={`A sentence or two is enough, e.g. "We're a ${industry.toLowerCase()} business offering ..."`}
          >
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              defaultValue={extractState?.values?.description}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            />
          </Field>
          {extractState?.error ? <p className="text-sm text-danger">{extractState.error}</p> : null}
          <Button type="submit" disabled={extracting}>
            {extracting ? 'Extracting…' : 'Extract profile'}
          </Button>
        </form>
      </Card>
    );
  }

  const draft = extractState.draft;

  return (
    <Card>
      <form action={saveAction} className="space-y-4">
        <p className="text-sm text-muted">
          Review and edit before saving - nothing is kept until you save.
        </p>
        <input type="hidden" name="website" value={extractState.values?.website ?? ''} />

        <Field label="Description" htmlFor="description">
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            defaultValue={draft.description}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          />
        </Field>

        <Field label="Offerings" htmlFor="offerings" hint="One per line: name | category">
          <textarea
            id="offerings"
            name="offerings"
            rows={5}
            defaultValue={offeringsToText(draft.offerings)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          />
        </Field>

        <Field
          label="Pricing"
          htmlFor="pricing"
          hint="One per line: label | amount | currency | unit (unit optional)"
        >
          <textarea
            id="pricing"
            name="pricing"
            rows={4}
            defaultValue={pricingToText(draft.pricing)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          />
        </Field>

        <Field label="Target customers (optional)" htmlFor="targetCustomers">
          <Input id="targetCustomers" name="targetCustomers" defaultValue={draft.targetCustomers} />
        </Field>

        {saveState?.error ? <p className="text-sm text-danger">{saveState.error}</p> : null}

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </form>
    </Card>
  );
}
