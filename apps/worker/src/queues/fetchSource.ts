import { DelayedError, Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { isSourceDue } from '@cip/core';
import type { Database } from '@cip/db';
import { listActiveSources } from '@cip/db';
import { runFetchSource } from '../jobs/fetchSource';
import { QUEUE_NAMES, type ExtractEventsJobData, type FetchSourceJobData } from './names';
import { SCHEDULER_SCAN_INTERVAL_MS } from '@cip/core';

type JobData = FetchSourceJobData | Record<string, never>; // scan job carries no data

export async function startFetchSourceQueue(
  connection: Redis,
  db: Database,
  logger: Logger,
  enqueueExtractEvents: (data: ExtractEventsJobData) => Promise<void>,
) {
  const queue = new Queue<JobData>(QUEUE_NAMES.fetchSource, { connection });

  await queue.upsertJobScheduler(
    'scan-due-sources',
    { every: SCHEDULER_SCAN_INTERVAL_MS },
    { name: 'scan', data: {}, opts: { removeOnComplete: 5, removeOnFail: 20 } },
  );

  const worker = new Worker<JobData>(
    QUEUE_NAMES.fetchSource,
    async (job, token) => {
      if (job.name === 'scan') {
        const active = await listActiveSources(db);
        const due = active.filter((s) => isSourceDue(s.type, s.lastFetchedAt));
        for (const source of due) {
          await queue.add(
            'fetch-one',
            { sourceId: source.id },
            {
              removeOnComplete: 50,
              removeOnFail: 200,
              jobId: `fetch-one:${source.id}:${Date.now()}`,
            },
          );
        }
        return { scanned: active.length, enqueued: due.length };
      }

      const { sourceId } = job.data as FetchSourceJobData;
      const result = await runFetchSource(
        { db, redis: connection, logger, enqueueExtractEvents },
        sourceId,
      );

      if (result.outcome === 'rate-limited') {
        // Reschedule without counting as a failed attempt - the standard BullMQ pattern for
        // "not ready yet, try again later" (see DelayedError's doc comment in bullmq).
        await job.moveToDelayed(Date.now() + result.retryAfterMs, token);
        throw new DelayedError();
      }

      return result;
    },
    { connection, concurrency: 4, drainDelay: 30, stalledInterval: 5 * 60 * 1000 },
  );

  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, job: job?.name, err }, 'fetch-source job failed'),
  );

  return {
    queue,
    close: async () => {
      await worker.close();
      await queue.close();
    },
  };
}
