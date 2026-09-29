import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOfferingMatrix, getWorkspaceForOwner } from '@cip/db';
import { Card } from '@/components/ui/card';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABEL: Record<'yes' | 'no' | 'unknown', string> = { yes: '✓', no: '—', unknown: '?' };
const STATUS_COLOR: Record<'yes' | 'no' | 'unknown', string> = {
  yes: 'text-success',
  no: 'text-muted',
  unknown: 'text-muted',
};

// Offering comparison matrix (spec §5 F8): offerings as rows, self + each competitor as
// columns, yes/no/unknown, every yes/no traceable to the events behind it.
export default async function OfferingMatrixPage({
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

  const { competitors, rows } = await getOfferingMatrix(db, workspaceId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/workspaces/${workspaceId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {workspace.name}
        </Link>
        <h1 className="text-2xl font-semibold">Offering matrix</h1>
        <p className="text-sm text-muted">
          Updates automatically from monitored events. “?” means no evidence either way, not “no”.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No offerings yet - they appear here once your business profile is saved and competitor
            events start coming in.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-medium">Offering</th>
                <th className="px-3 py-2 text-center font-medium">You</th>
                {competitors.map((c) => (
                  <th key={c.id} className="px-3 py-2 text-center font-medium">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ offering, self, byCompetitor }) => (
                <tr key={offering.id} className="border-b border-border/50">
                  <td className="py-2 pr-4">
                    <div>{offering.name}</div>
                    <div className="text-xs text-muted">{offering.category}</div>
                  </td>
                  <td className={`px-3 py-2 text-center ${STATUS_COLOR[self.status]}`}>
                    {STATUS_LABEL[self.status]}
                  </td>
                  {competitors.map((c) => {
                    const cell = byCompetitor[c.id] ?? { status: 'unknown' as const, evidence: [] };
                    return (
                      <td
                        key={c.id}
                        className={`px-3 py-2 text-center ${STATUS_COLOR[cell.status]}`}
                      >
                        {cell.evidence.length > 0 ? (
                          <details className="inline-block">
                            <summary className="cursor-pointer list-none">
                              {STATUS_LABEL[cell.status]}
                            </summary>
                            <ul className="mt-1 space-y-1 text-left text-xs">
                              {cell.evidence.map((e) => (
                                <li key={e.sourceId}>
                                  <a
                                    href={e.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="break-all text-primary underline"
                                  >
                                    {e.eventTitle}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : (
                          STATUS_LABEL[cell.status]
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
