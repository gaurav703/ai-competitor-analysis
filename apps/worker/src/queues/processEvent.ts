import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import type { Database } from '@cip/db';
import { processEventCandidateSchema, runProcessEvent } from '../jobs/processEvent';
import { QUEUE_NAMES, type ProcessEventJobData } from './names';

export async function startProcessEventQueue(connection: Redis, db: Database, logger: Logger) {
  const queue = new Queue<ProcessEventJobData>(QUEUE_NAMES.processEvent, { connection });

  const worker = new Worker<ProcessEventJobData>(
    QUEUE_NAMES.processEvent,
    async (job) => {
      const candidate = processEventCandidateSchema.parse(job.data.candidate);
      return runProcessEvent(db, logger, job.data.workspaceId, job.data.competitorId, candidate);
    },
    // Per-workspace serial (SYSTEM_DESIGN §4.3) matters for dedup correctness once there are
    // multiple workspaces; concurrency 1 is the simple, correct MVP version of that.
    { connection, concurrency: 1, drainDelay: 30, stalledInterval: 5 * 60 * 1000 },
  );

  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, err }, 'process-event job failed'),
  );

  return {
    enqueue: (data: ProcessEventJobData) =>
      queue
        .add('process', data, { removeOnComplete: 100, removeOnFail: 500 })
        .then(() => undefined),
    close: async () => {
      await worker.close();
      await queue.close();
    },
  };
}
