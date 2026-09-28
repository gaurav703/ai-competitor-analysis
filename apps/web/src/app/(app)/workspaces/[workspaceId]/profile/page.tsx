import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkspaceForOwner } from '@cip/db';
import { Card } from '@/components/ui/card';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ProfileWizard } from './profile-wizard';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// F1: business profile extraction, review and edit.
export default async function ProfilePage({
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
          href={`/workspaces/${workspaceId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {workspace.name}
        </Link>
        <h1 className="text-2xl font-semibold">Business profile</h1>
        <p className="text-sm text-muted">
          Used to compare your business against your competitors - the same way their profiles are
          built from public sources.
        </p>
      </div>

      {workspace.businessProfile ? (
        <Card className="space-y-3">
          <p className="font-medium">Profile saved</p>
          <p className="text-sm">{workspace.businessProfile.description}</p>
          {workspace.businessProfile.offerings.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted">Offerings</p>
              <ul className="text-sm">
                {workspace.businessProfile.offerings.map((o) => (
                  <li key={o.id}>{o.name}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : (
        <ProfileWizard workspaceId={workspaceId} industry={workspace.industry} />
      )}
    </div>
  );
}
