import Link from 'next/link';
import { notFound } from 'next/navigation';
import { INDUSTRY_CATEGORY_LABELS } from '@cip/core';
import { getWorkspaceForOwner } from '@cip/db';
import { Card } from '@/components/ui/card';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WorkspacePage({
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
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← All workspaces
        </Link>
        <h1 className="text-2xl font-semibold">{workspace.name}</h1>
        <p className="text-sm text-muted">
          {workspace.industry} · {INDUSTRY_CATEGORY_LABELS[workspace.industryCategory]}
          {workspace.region ? ` · ${workspace.region}` : ''}
        </p>
      </div>

      <Card className="space-y-2">
        <p className="font-medium">Your workspace is ready</p>
        <p className="text-sm text-muted">
          Next up: add your business profile and competitors. Monitoring, comparisons and the “Where
          am I lagging?” report will appear here as they are built.
        </p>
      </Card>
    </div>
  );
}
