import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkspaceForOwner, listCompetitors } from '@cip/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CompetitorsPage({
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

  const competitors = await listCompetitors(db, workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href={`/workspaces/${workspaceId}`}
            className="text-sm text-muted hover:text-foreground"
          >
            ← {workspace.name}
          </Link>
          <h1 className="text-2xl font-semibold">Competitors</h1>
        </div>
        <Link href={`/workspaces/${workspaceId}/competitors/new`}>
          <Button>Add competitor</Button>
        </Link>
      </div>

      {competitors.length === 0 ? (
        <Card className="space-y-2">
          <p className="font-medium">No competitors yet</p>
          <p className="text-sm text-muted">
            Add a competitor to start monitoring their public sources and see what changes.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {competitors.map((c) => (
            <Link key={c.id} href={`/workspaces/${workspaceId}/competitors/${c.id}`}>
              <Card className="space-y-1 transition-colors hover:bg-background">
                <p className="font-medium">{c.name}</p>
                {c.website ? <p className="truncate text-sm text-muted">{c.website}</p> : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
