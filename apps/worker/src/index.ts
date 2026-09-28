import { createDb, pingDb } from '@cip/db';
import { readEnv } from './env';
import { createLlmDeps } from './llm';
import { logger } from './logger';
import { startExtractEventsQueue } from './queues/extractEvents';
import { startFetchSourceQueue } from './queues/fetchSource';
import { startProcessEventQueue } from './queues/processEvent';
import { startSystemQueue } from './queues/system';
import { createRedis } from './redis';

async function main() {
  const env = readEnv();

  const { db, close: closeDb } = createDb(env.DATABASE_URL);
  await pingDb(db);
  logger.info('connected to database');

  const redis = createRedis(env.REDIS_URL);
  await redis.ping();
  logger.info('connected to redis');

  const llmDeps = createLlmDeps(db);

  const systemQueue = await startSystemQueue(redis, logger);
  // Wired in dependency order: fetch-source enqueues into extract-events, which enqueues into
  // process-event (spec §3 pipeline) - each stage started before the one that feeds it.
  const processEventQueue = await startProcessEventQueue(redis, db, logger);
  const extractEventsQueue = await startExtractEventsQueue(
    redis,
    db,
    llmDeps,
    logger,
    processEventQueue.enqueue,
  );
  const fetchSourceQueue = await startFetchSourceQueue(
    redis,
    db,
    logger,
    extractEventsQueue.enqueue,
  );
  logger.info('worker started');

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    await fetchSourceQueue.close();
    await extractEventsQueue.close();
    await processEventQueue.close();
    await systemQueue.close();
    redis.disconnect();
    await closeDb();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'worker failed to start');
  process.exit(1);
});
