import { and, desc, eq } from 'drizzle-orm';
import type { ConfidenceLevel, Evidence, Origin, SubjectType } from '@cip/core';
import type { Database } from '../client';
import { type MetricValueRow, metricValues } from '../schema';

export type NewMetricValueInput = {
  workspaceId: string;
  metricId: string;
  subjectType: SubjectType;
  subjectId?: string;
  value: unknown;
  origin: Origin;
  confidence: ConfidenceLevel;
  evidence?: Evidence[];
  observedAt?: Date;
};

// MetricValue is append-only (SYSTEM_DESIGN §5.2): a correction is a new row, not an update -
// "current" is always the latest by observedAt. This is what lets a value's history be shown
// later, and matches spec §4/F9 exactly.
export function createMetricValue(
  db: Database,
  input: NewMetricValueInput,
): Promise<MetricValueRow> {
  return db
    .insert(metricValues)
    .values({
      workspaceId: input.workspaceId,
      metricId: input.metricId,
      subjectType: input.subjectType,
      subjectId: input.subjectId ?? null,
      value: input.value,
      origin: input.origin,
      confidence: input.confidence,
      evidence: input.evidence ?? [],
      observedAt: input.observedAt ?? new Date(),
    })
    .returning()
    .then(([row]) => {
      if (!row) throw new Error('Failed to create metric value');
      return row;
    });
}

// Latest value per metricId for one subject - "current" per the append-only history rule.
// Keyed by metricId so callers can do `latest.get(metricDef.id)`.
export async function getLatestMetricValues(
  db: Database,
  workspaceId: string,
  subjectType: SubjectType,
  subjectId?: string,
): Promise<Map<string, MetricValueRow>> {
  // subjectType alone is enough to scope 'self' rows (subjectId is always null for those);
  // 'competitor' rows additionally need subjectId to pick out the right one.
  const conditions = [
    eq(metricValues.workspaceId, workspaceId),
    eq(metricValues.subjectType, subjectType),
  ];
  if (subjectId) conditions.push(eq(metricValues.subjectId, subjectId));

  const rows = await db
    .select()
    .from(metricValues)
    .where(and(...conditions))
    .orderBy(desc(metricValues.observedAt));

  const latest = new Map<string, MetricValueRow>();
  for (const row of rows) {
    if (!latest.has(row.metricId)) latest.set(row.metricId, row);
  }
  return latest;
}
