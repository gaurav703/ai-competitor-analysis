import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';

export const SYSTEM_QUEUE = 'system';
const HEARTBEAT_EVERY_MS = 10 * 60 * 1000;

// Proves the queue pipeline works end to end. Real queues (fetch-source, extract-events, ...) come in later phases.
export async function startSystemQueue(connection: Redis, logger: Logger) {
  const queue = new Queue(SYSTEM_QUEUE, { connection });

  await queue.upsertJobScheduler(
    'heartbeat',
    { every: HEARTBEAT_EVERY_MS },
    { name: 'heartbeat', data: {}, opts: { removeOnComplete: 10, removeOnFail: 50 } },
  );

  const worker = new Worker(
    SYSTEM_QUEUE,
    async (job) => {
      logger.info({ jobId: job.id, job: job.name }, 'system job ran');
      return { ok: true, at: new Date().toISOString() };
    },
    {
      connection,
      concurrency: 1,
      // Fewer Redis commands while idle (matters on Upstash's free tier).
      drainDelay: 30,
      stalledInterval: 5 * 60 * 1000,
    },
  );

  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'system job failed'));

  return {
    close: async () => {
      await worker.close();
      await queue.close();
    },
  };
}
