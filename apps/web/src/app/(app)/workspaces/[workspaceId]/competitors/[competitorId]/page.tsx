import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EVENT_TYPES, IMPORTANCE_LEVELS, type ImportanceLevel } from '@cip/core';
import { getCompetitor, getWorkspaceForOwner, listEventsForCompetitor } from '@cip/db';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const IMPORTANCE_COLOR: Record<ImportanceLevel, string> = {
  high: 'text-danger',
  medium: 'text-foreground',
  low: 'text-muted',
};

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

// Competitor timeline (spec §5 F7): reverse-chronological, filterable by type and importance,
// each item expandable to its evidence.
export default async function CompetitorTimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; competitorId: string }>;
  searchParams: Promise<{ type?: string; importance?: string }>;
}) {
  const { workspaceId, competitorId } = await params;
  if (!UUID_RE.test(workspaceId) || !UUID_RE.test(competitorId)) notFound();

  const filters = await searchParams;
  const type = EVENT_TYPES.find((t) => t === filters.type);
  const importance = IMPORTANCE_LEVELS.find((i) => i === filters.importance);

  const user = await requireUser();
  const db = getDb();
  const workspace = await getWorkspaceForOwner(db, user.id, workspaceId);
  if (!workspace) notFound();

  const competitor = await getCompetitor(db, workspaceId, competitorId);
  if (!competitor) notFound();

  const events = await listEventsForCompetitor(db, workspaceId, competitorId, { type, importance });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/workspaces/${workspaceId}/competitors`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Competitors
        </Link>
        <h1 className="text-2xl font-semibold">{competitor.name}</h1>
        {competitor.website ? <p className="text-sm text-muted">{competitor.website}</p> : null}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="type" className="text-sm font-medium">
            Type
          </label>
          <Select id="type" name="type" defaultValue={type ?? ''} className="w-auto">
            <option value="">All types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {labelize(t)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="importance" className="text-sm font-medium">
            Importance
          </label>
          <Select
            id="importance"
            name="importance"
            defaultValue={importance ?? ''}
            className="w-auto"
          >
            <option value="">All levels</option>
            {IMPORTANCE_LEVELS.map((i) => (
              <option key={i} value={i}>
                {labelize(i)}
              </option>
            ))}
          </Select>
        </div>
        <button type="submit" className="h-10 text-sm text-muted underline hover:text-foreground">
          Apply
        </button>
      </form>

      {events.length === 0 ? (
        <Card className="space-y-2">
          <p className="font-medium">No events yet</p>
          <p className="text-sm text-muted">
            Once sources are added and monitored, changes will show up here with evidence.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <Card className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted">
                      {labelize(event.type)} ·{' '}
                      {new Date(event.occurredAt ?? event.detectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium uppercase ${IMPORTANCE_COLOR[event.importance as ImportanceLevel]}`}
                  >
                    {event.importance}
                  </span>
                </div>
                <p className="text-sm">{event.summary}</p>
                <p className="text-xs text-muted">{event.importanceReason}</p>

                {event.evidence.length > 0 ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted hover:text-foreground">
                      Evidence ({event.evidence.length})
                    </summary>
                    <ul className="mt-2 space-y-2 border-l border-border pl-3">
                      {event.evidence.map((e, i) => (
                        <li key={`${e.sourceId}-${i}`} className="space-y-1">
                          <a
                            href={e.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-primary underline"
                          >
                            {e.sourceUrl}
                          </a>
                          {e.snapshotExcerpt ? (
                            <p className="text-xs text-muted">
                              &ldquo;{e.snapshotExcerpt}&hellip;&rdquo;
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
