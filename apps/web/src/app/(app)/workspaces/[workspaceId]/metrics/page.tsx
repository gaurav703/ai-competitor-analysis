import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DIMENSIONS, getMetricDefinitions, type MetricDefinition } from '@cip/core';
import { getLatestMetricValues, getWorkspaceForOwner } from '@cip/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { MetricsForm } from './metrics-form';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MetricFieldProps = { def: MetricDefinition; currentValue: unknown };

// F9 (first part): the user fills in or corrects their own metric values across the 10
// dimensions, using this industry's built-in metric config from Phase 2. Competitor values
// aren't auto-extracted yet (see docs/PROGRESS.md Phase 7 notes) - their columns just don't
// exist here; unknown values are simply never shown as anything but unknown.
export default async function MetricsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { workspaceId } = await params;
  if (!UUID_RE.test(workspaceId)) notFound();
  const { saved } = await searchParams;

  const user = await requireUser();
  const db = getDb();
  const workspace = await getWorkspaceForOwner(db, user.id, workspaceId);
  if (!workspace) notFound();

  const definitions = getMetricDefinitions(workspace.industryCategory);
  const latest = await getLatestMetricValues(db, workspaceId, 'self');

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/workspaces/${workspaceId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {workspace.name}
        </Link>
        <h1 className="text-2xl font-semibold">Your metrics</h1>
        <p className="text-sm text-muted">
          Fill in what you know. Leave a field blank to keep it unknown - never guessed, never
          counted as zero or false.
        </p>
        {saved ? <p className="text-sm text-success">Saved.</p> : null}
      </div>

      <MetricsForm workspaceId={workspaceId}>
        {DIMENSIONS.map((dimension) => {
          const defsForDimension = definitions.filter((d) => d.dimensionKey === dimension.key);
          if (defsForDimension.length === 0) return null;
          return (
            <Card key={dimension.key} className="space-y-4">
              <p className="font-medium">{dimension.name}</p>
              {defsForDimension.map((def) => {
                const current = latest.get(def.id)?.value;
                return (
                  <div key={def.id} className="space-y-1.5">
                    <label htmlFor={`metric__${def.id}`} className="text-sm">
                      {def.name}
                      {def.unit ? <span className="text-muted"> ({def.unit})</span> : null}
                    </label>
                    {def.valueType === 'boolean' ? (
                      <Select
                        id={`metric__${def.id}`}
                        name={`metric__${def.id}`}
                        defaultValue={typeof current === 'boolean' ? String(current) : ''}
                      >
                        <option value="">Unknown</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    ) : (
                      <Input
                        id={`metric__${def.id}`}
                        name={`metric__${def.id}`}
                        type={
                          ['number', 'rating', 'currency', 'count', 'duration'].includes(
                            def.valueType,
                          )
                            ? 'number'
                            : 'text'
                        }
                        step="any"
                        defaultValue={
                          current === undefined || current === null ? '' : String(current)
                        }
                      />
                    )}
                  </div>
                );
              })}
            </Card>
          );
        })}
        <Button type="submit">Save metrics</Button>
      </MetricsForm>
    </div>
  );
}
