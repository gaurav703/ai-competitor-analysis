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

      <Link href={`/workspaces/${workspaceId}/profile`}>
        <Card className="space-y-2 transition-colors hover:bg-background">
          <p className="font-medium">Business profile</p>
          <p className="text-sm text-muted">
            {workspace.businessProfile
              ? 'Saved. Offerings, pricing and target customers used to compare you against competitors.'
              : 'Not set up yet — extract from your website or a short description, then review and edit.'}
          </p>
        </Card>
      </Link>

      <Link href={`/workspaces/${workspaceId}/competitors`}>
        <Card className="space-y-2 transition-colors hover:bg-background">
          <p className="font-medium">Competitors</p>
          <p className="text-sm text-muted">
            Add competitors and see what changed — pricing, offerings, reviews — with evidence for
            every event.
          </p>
        </Card>
      </Link>

      <Link href={`/workspaces/${workspaceId}/sources`}>
        <Card className="space-y-2 transition-colors hover:bg-background">
          <p className="font-medium">Your own sources</p>
          <p className="text-sm text-muted">
            Monitor your own pricing page, menu or changelog so your profile stays current
            automatically.
          </p>
        </Card>
      </Link>

      <Link href={`/workspaces/${workspaceId}/matrix`}>
        <Card className="space-y-2 transition-colors hover:bg-background">
          <p className="font-medium">Offering matrix</p>
          <p className="text-sm text-muted">
            You vs. each competitor, offering by offering - yes, no or unknown, every cell traceable
            to evidence.
          </p>
        </Card>
      </Link>

      <Link href={`/workspaces/${workspaceId}/prices`}>
        <Card className="space-y-2 transition-colors hover:bg-background">
          <p className="font-medium">Price position</p>
          <p className="text-sm text-muted">
            Latest known price per equivalent offering, currency and unit as recorded.
          </p>
        </Card>
      </Link>

      <Link href={`/workspaces/${workspaceId}/metrics`}>
        <Card className="space-y-2 transition-colors hover:bg-background">
          <p className="font-medium">Your metrics</p>
          <p className="text-sm text-muted">
            Fill in or correct your own values across all 10 comparison dimensions.
          </p>
        </Card>
      </Link>

      <Card className="space-y-2">
        <p className="font-medium">Your workspace is ready</p>
        <p className="text-sm text-muted">
          The comparison engine and the “Where am I lagging?” report will appear here as they are
          built.
        </p>
      </Card>
    </div>
  );
}
