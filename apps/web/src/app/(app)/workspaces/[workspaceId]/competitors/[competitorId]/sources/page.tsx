import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSuggestedSourceTypes } from '@cip/core';
import { getCompetitor, getWorkspaceForOwner, listSourcesForSubject } from '@cip/db';
import { SourceSuggestionsForm } from '@/components/sources/source-suggestions-form';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// F2: industry-aware source suggestions per competitor, confirmed/edited by the user.
export default async function CompetitorSourcesPage({
  params,
}: {
  params: Promise<{ workspaceId: string; competitorId: string }>;
}) {
  const { workspaceId, competitorId } = await params;
  if (!UUID_RE.test(workspaceId) || !UUID_RE.test(competitorId)) notFound();

  const user = await requireUser();
  const db = getDb();
  const workspace = await getWorkspaceForOwner(db, user.id, workspaceId);
  if (!workspace) notFound();

  const competitor = await getCompetitor(db, workspaceId, competitorId);
  if (!competitor) notFound();

  const existingSources = await listSourcesForSubject(db, workspaceId, 'competitor', competitorId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/workspaces/${workspaceId}/competitors/${competitorId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {competitor.name}
        </Link>
        <h1 className="text-2xl font-semibold">Sources for {competitor.name}</h1>
        <p className="text-sm text-muted">
          These get monitored for changes - each one becomes evidence behind future events.
        </p>
      </div>

      <SourceSuggestionsForm
        workspaceId={workspaceId}
        subjectType="competitor"
        subjectId={competitorId}
        redirectTo={`/workspaces/${workspaceId}/competitors/${competitorId}`}
        suggestedTypes={getSuggestedSourceTypes(workspace.industryCategory)}
        existing={existingSources.map((s) => ({ type: s.type, url: s.url }))}
      />
    </div>
  );
}
