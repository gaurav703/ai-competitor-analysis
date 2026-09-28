import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import type { Database } from '@cip/db';
import type { LlmDeps } from '@cip/prompts';
import { runExtractEvents } from '../jobs/extractEvents';
import { QUEUE_NAMES, type ExtractEventsJobData, type ProcessEventJobData } from './names';

export async function startExtractEventsQueue(
  connection: Redis,
  db: Database,
  llmDeps: LlmDeps,
  logger: Logger,
  enqueueProcessEvent: (data: ProcessEventJobData) => Promise<void>,
) {
  const queue = new Queue<ExtractEventsJobData>(QUEUE_NAMES.extractEvents, { connection });

  const worker = new Worker<ExtractEventsJobData>(
    QUEUE_NAMES.extractEvents,
    async (job) => {
      const { sourceId, snapshotId } = job.data;
      return runExtractEvents({ db, llmDeps, logger, enqueueProcessEvent }, sourceId, snapshotId);
    },
    // Concurrency 1: free-tier LLM rate limits (D-002) are the real bottleneck here, not CPU.
    { connection, concurrency: 1, drainDelay: 30, stalledInterval: 5 * 60 * 1000 },
  );

  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, err }, 'extract-events job failed'),
  );

  return {
    enqueue: (data: ExtractEventsJobData) =>
      queue
        .add('extract', data, { removeOnComplete: 100, removeOnFail: 500 })
        .then(() => undefined),
    close: async () => {
      await worker.close();
      await queue.close();
    },
  };
}
