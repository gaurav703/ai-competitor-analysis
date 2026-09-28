import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkspaceForOwner } from '@cip/db';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { CompetitorForm } from './competitor-form';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewCompetitorPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  if (!UUID_RE.test(workspaceId)) notFound();

  const user = await requireUser();
  const workspace = await getWorkspaceForOwner(getDb(), user.id, workspaceId);
  if (!workspace) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/workspaces/${workspaceId}/competitors`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Competitors
        </Link>
        <h1 className="text-2xl font-semibold">Add a competitor</h1>
      </div>
      <CompetitorForm workspaceId={workspaceId} />
    </div>
  );
}
