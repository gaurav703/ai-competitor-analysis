import { sha256Hex, THRESHOLDS } from '@cip/core';
import type { Database, Source } from '@cip/db';
import {
  createSnapshot,
  getSource,
  recordSourceFetchError,
  recordSourceFetchSuccess,
  snapshotHashExists,
} from '@cip/db';
import type { Logger } from 'pino';
import type { Redis } from 'ioredis';
import { getAdapter } from '../adapters';
import { domainOf, tryAcquireDomainSlot } from '../lib/rateLimit';
import { isAllowedByRobots } from '../lib/robots';
import type { ExtractEventsJobData } from '../queues/names';

const USER_AGENT =
  'CompetitiveIntelligencePlatform/0.1 (+https://github.com/gaurav703/ai-competitor-analysis)';
const DOMAIN_MIN_INTERVAL_MS = 10_000; // SYSTEM_DESIGN §10: 1 request / 10s per domain
const ROBOTS_CHECKED_TYPES = new Set([
  'website',
  'pricing_page',
  'product_catalog',
  'menu',
  'changelog',
  'blog',
  'google_news',
]);

export type FetchSourceResult =
  | { outcome: 'rate-limited'; retryAfterMs: number }
  | { outcome: 'robots-disallowed' }
  | { outcome: 'no-change' }
  | { outcome: 'pending-confirmation' }
  | { outcome: 'snapshot-created'; snapshotId: string }
  | { outcome: 'items-processed'; newSnapshotIds: string[] }
  | { outcome: 'error'; message: string };

export type FetchSourceDeps = {
  db: Database;
  redis: Redis;
  logger: Logger;
  enqueueExtractEvents: (data: ExtractEventsJobData) => Promise<void>;
};

export async function runFetchSource(
  deps: FetchSourceDeps,
  sourceId: string,
): Promise<FetchSourceResult> {
  const { db, redis, logger, enqueueExtractEvents } = deps;
  const source = await getSource(db, sourceId);
  if (!source) return { outcome: 'error', message: `Source ${sourceId} not found` };
  if (source.status !== 'active')
    return { outcome: 'error', message: `Source ${sourceId} is ${source.status}` };

  // Rate limit + robots.txt only apply to adapters that fetch a URL directly ourselves.
  if (ROBOTS_CHECKED_TYPES.has(source.type)) {
    const domain = safeDomainOf(source.url);
    if (domain) {
      const slot = await tryAcquireDomainSlot(redis, domain, DOMAIN_MIN_INTERVAL_MS);
      if (!slot.allowed) return { outcome: 'rate-limited', retryAfterMs: slot.retryAfterMs };

      const allowed = await isAllowedByRobots(source.url, USER_AGENT).catch(() => true);
      if (!allowed) {
        logger.warn({ sourceId, url: source.url }, 'blocked by robots.txt');
        return { outcome: 'robots-disallowed' };
      }
    }
  }

  const adapter = getAdapter(source.type);

  try {
    const raw = await adapter.fetch(source, { userAgent: USER_AGENT });
    const normalized = adapter.normalize(raw);

    if (adapter.items) {
      const items = await adapter.items(normalized, raw);
      const newSnapshotIds: string[] = [];
      for (const item of items) {
        const hash = sha256Hex(item.externalId);
        if (await snapshotHashExists(db, sourceId, hash)) continue;
        const snapshot = await createSnapshot(db, {
          workspaceId: source.workspaceId,
          sourceId,
          hash,
          content: JSON.stringify(item.raw),
          fetchedAt: raw.fetchedAt,
        });
        newSnapshotIds.push(snapshot.id);
        await enqueueExtractEvents({ sourceId, snapshotId: snapshot.id });
      }
      await recordSourceFetchSuccess(db, sourceId, {});
      return { outcome: 'items-processed', newSnapshotIds };
    }

    // Text-diff path (website-shaped sources): hash the normalized text and require the
    // change to persist across THRESHOLDS.websiteConfirmFetches fetches before it counts -
    // filters out A/B tests and rotating promos (spec §9 "diff noise").
    const hash = sha256Hex(normalized.text);

    if (hash === source.lastHash) {
      await recordSourceFetchSuccess(db, sourceId, { pendingHash: null });
      return { outcome: 'no-change' };
    }

    const confirmed = hash === source.pendingHash;
    if (!confirmed && THRESHOLDS.websiteConfirmFetches > 1) {
      await recordSourceFetchSuccess(db, sourceId, { pendingHash: hash });
      return { outcome: 'pending-confirmation' };
    }

    const snapshot = await createSnapshot(db, {
      workspaceId: source.workspaceId,
      sourceId,
      hash,
      content: normalized.text,
      fetchedAt: raw.fetchedAt,
    });
    await recordSourceFetchSuccess(db, sourceId, { lastHash: hash, pendingHash: null });
    await enqueueExtractEvents({ sourceId, snapshotId: snapshot.id });
    return { outcome: 'snapshot-created', snapshotId: snapshot.id };
  } catch (err) {
    // One source's failure never blocks the others (spec §3) - this catch is the boundary.
    await recordSourceFetchError(db, sourceId);
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ sourceId, err: message }, 'fetch-source failed');
    return { outcome: 'error', message };
  }
}

function safeDomainOf(url: string): string | null {
  try {
    return domainOf(url);
  } catch {
    return null;
  }
}

// Re-exported for the scheduler, which needs the raw row shape without pulling in the job runner.
export type { Source };
