'use client';

import { useActionState } from 'react';
import { INDUSTRY_CATEGORIES, INDUSTRY_CATEGORY_LABELS } from '@cip/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { createWorkspaceAction, type CreateWorkspaceState } from './actions';

export function WorkspaceForm() {
  const [state, action, pending] = useActionState<CreateWorkspaceState, FormData>(
    createWorkspaceAction,
    undefined,
  );

  return (
    <Card>
      <form action={action} className="space-y-4">
        <Field label="Business name" htmlFor="name" error={state?.fieldErrors?.name}>
          <Input id="name" name="name" defaultValue={state?.values?.name} required />
        </Field>

        <Field
          label="Industry"
          htmlFor="industry"
          error={state?.fieldErrors?.industry}
          hint="In your own words, e.g. “South Indian restaurant” or “HR software for SMBs”"
        >
          <Input id="industry" name="industry" defaultValue={state?.values?.industry} required />
        </Field>

        <Field
          label="Category"
          htmlFor="industryCategory"
          error={state?.fieldErrors?.industryCategory}
        >
          <Select
            id="industryCategory"
            name="industryCategory"
            defaultValue={state?.values?.industryCategory ?? ''}
            required
          >
            <option value="" disabled>
              Choose a category
            </option>
            {INDUSTRY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {INDUSTRY_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Region (optional)"
          htmlFor="region"
          error={state?.fieldErrors?.region}
          hint="City or area you compete in. Important for local businesses."
        >
          <Input id="region" name="region" defaultValue={state?.values?.region} />
        </Field>

        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
    </Card>
  );
}
