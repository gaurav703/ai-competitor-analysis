import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPricePositions, getWorkspaceForOwner } from '@cip/db';
import { Card } from '@/components/ui/card';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Price position map (spec §5 F8): equivalent offerings side by side, currency/unit as
// recorded. No cross-currency conversion - amounts are only ever compared as-is.
export default async function PricePositionsPage({
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

  const positions = await getPricePositions(db, workspaceId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/workspaces/${workspaceId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {workspace.name}
        </Link>
        <h1 className="text-2xl font-semibold">Price position</h1>
        <p className="text-sm text-muted">
          Latest known price per offering. Amounts are shown as recorded - not converted across
          currencies.
        </p>
      </div>

      {positions.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No prices yet - add your own in the business profile, or wait for a pricing_change event
            from a monitored competitor.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {positions.map((position) => (
            <Card key={position.offeringId ?? 'ungrouped'} className="space-y-3">
              <p className="font-medium">{position.offeringName ?? 'Ungrouped prices'}</p>
              <ul className="space-y-2">
                {[...position.entries]
                  .sort((a, b) => Number(a.amount) - Number(b.amount))
                  .map((entry, i) => (
                    <li
                      key={`${entry.subjectType}-${entry.subjectId ?? 'self'}-${i}`}
                      className="flex items-baseline justify-between text-sm"
                    >
                      <span className={entry.subjectType === 'self' ? 'font-medium' : ''}>
                        {entry.subjectName}
                        {entry.subjectType === 'self' ? ' (you)' : ''}
                        <span className="text-muted"> — {entry.label}</span>
                      </span>
                      <span>
                        {entry.currency} {entry.amount}
                        {entry.unit ? ` ${entry.unit}` : ''}
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
