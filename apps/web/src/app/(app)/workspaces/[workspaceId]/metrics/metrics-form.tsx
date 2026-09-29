'use client';

import { useActionState, type ReactNode } from 'react';
import { saveMetricsAction, type SaveMetricsState } from './actions';

export function MetricsForm({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const boundAction = saveMetricsAction.bind(null, workspaceId);
  const [state, action] = useActionState<SaveMetricsState, FormData>(boundAction, undefined);

  return (
    <form action={action} className="space-y-4">
      {children}
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
