'use client';

import { useActionState } from 'react';
import type { SourceType, SubjectType } from '@cip/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  createSourcesAction,
  type CreateSourcesState,
} from '@/app/(app)/workspaces/[workspaceId]/sources/actions';

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export function SourceSuggestionsForm({
  workspaceId,
  subjectType,
  subjectId,
  redirectTo,
  suggestedTypes,
  existing,
}: {
  workspaceId: string;
  subjectType: SubjectType;
  subjectId?: string;
  redirectTo: string;
  suggestedTypes: SourceType[];
  existing: { type: SourceType; url: string }[];
}) {
  const boundAction = createSourcesAction.bind(
    null,
    workspaceId,
    subjectType,
    subjectId,
    redirectTo,
  );
  const [state, action, pending] = useActionState<CreateSourcesState, FormData>(
    boundAction,
    undefined,
  );

  const existingTypes = new Set(existing.map((s) => s.type));
  const toSuggest = suggestedTypes.filter((t) => !existingTypes.has(t));

  return (
    <div className="space-y-4">
      {existing.length > 0 ? (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Already monitoring</p>
          <ul className="space-y-1 text-sm text-muted">
            {existing.map((s) => (
              <li key={`${s.type}-${s.url}`}>
                {labelize(s.type)}: <span className="break-all">{s.url}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {toSuggest.length > 0 ? (
        <Card>
          <form action={action} className="space-y-4">
            <p className="text-sm text-muted">
              Suggested for this industry - fill in a URL for the ones you want monitored, leave the
              rest blank.
            </p>
            {toSuggest.map((type) => (
              <div key={type} className="space-y-1.5">
                <label htmlFor={`url__${type}`} className="text-sm font-medium">
                  {labelize(type)}
                </label>
                <Input
                  id={`url__${type}`}
                  name={`url__${type}`}
                  type="url"
                  placeholder="https://..."
                />
              </div>
            ))}
            {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save sources'}
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">
            All suggested sources for this industry are already added.
          </p>
        </Card>
      )}
    </div>
  );
}
