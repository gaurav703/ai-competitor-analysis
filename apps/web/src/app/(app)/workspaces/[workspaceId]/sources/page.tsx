import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSuggestedSourceTypes } from '@cip/core';
import { getWorkspaceForOwner, listSourcesForSubject } from '@cip/db';
import { SourceSuggestionsForm } from '@/components/sources/source-suggestions-form';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// F2 for the workspace's own business: "the user's own sources are monitored too, so the
// profile stays current" (spec §2A).
export default async function WorkspaceSourcesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  if (!UUID_RE.test(workspaceId)) notFound();

  const user = await requireUser();
  const db = getDb();
  const workspace = await getWorkspaceForOwner(db, user.id, workspaceId);
  if (!workspace) notFound();

  const existingSources = await listSourcesForSubject(db, workspaceId, 'self');

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/workspaces/${workspaceId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {workspace.name}
        </Link>
        <h1 className="text-2xl font-semibold">Your own sources</h1>
        <p className="text-sm text-muted">
          Monitoring your own pages keeps your profile and prices current automatically.
        </p>
      </div>

      <SourceSuggestionsForm
        workspaceId={workspaceId}
        subjectType="self"
        redirectTo={`/workspaces/${workspaceId}`}
        suggestedTypes={getSuggestedSourceTypes(workspace.industryCategory)}
        existing={existingSources.map((s) => ({ type: s.type, url: s.url }))}
      />
    </div>
  );
}
