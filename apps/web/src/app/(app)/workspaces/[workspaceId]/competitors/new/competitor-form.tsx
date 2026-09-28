'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { createCompetitorAction, type CreateCompetitorState } from './actions';

export function CompetitorForm({ workspaceId }: { workspaceId: string }) {
  const boundAction = createCompetitorAction.bind(null, workspaceId);
  const [state, action, pending] = useActionState<CreateCompetitorState, FormData>(
    boundAction,
    undefined,
  );

  return (
    <Card>
      <form action={action} className="space-y-4">
        <Field label="Competitor name" htmlFor="name" error={state?.fieldErrors?.name}>
          <Input id="name" name="name" defaultValue={state?.values?.name} required />
        </Field>

        <Field
          label="Website (optional)"
          htmlFor="website"
          error={state?.fieldErrors?.website}
          hint="Used later to suggest sources to monitor (pricing page, menu, changelog, ...)"
        >
          <Input
            id="website"
            name="website"
            type="url"
            placeholder="https://example.com"
            defaultValue={state?.values?.website}
          />
        </Field>

        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add competitor'}
        </Button>
      </form>
    </Card>
  );
}
