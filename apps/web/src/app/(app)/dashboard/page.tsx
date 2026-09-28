import Link from 'next/link';
import { INDUSTRY_CATEGORY_LABELS } from '@cip/core';
import { listWorkspacesForOwner } from '@cip/db';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export default async function DashboardPage() {
  const user = await requireUser();
  const workspaces = await listWorkspacesForOwner(getDb(), user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your workspaces</h1>
          <p className="text-sm text-muted">One workspace per business you want to compare.</p>
        </div>
        <Link href="/workspaces/new" className={buttonVariants()}>
          New workspace
        </Link>
      </div>

      {workspaces.length === 0 ? (
        <Card className="space-y-3 text-center">
          <p className="font-medium">No workspaces yet</p>
          <p className="text-sm text-muted">
            Create a workspace for your business to start tracking competitors.
          </p>
          <Link href="/workspaces/new" className={buttonVariants({ variant: 'outline' })}>
            Create your first workspace
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <Link href={`/workspaces/${ws.id}`}>
                <Card className="space-y-1 transition-colors hover:border-foreground/30">
                  <p className="font-medium">{ws.name}</p>
                  <p className="text-sm text-muted">
                    {ws.industry} · {INDUSTRY_CATEGORY_LABELS[ws.industryCategory]}
                    {ws.region ? ` · ${ws.region}` : ''}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
