import { createDb, pingDb } from '@cip/db';
import { readEnv } from './env';
import { createLlmDeps } from './llm';
import { logger } from './logger';
import { startExtractEventsQueue } from './queues/extractEvents';
import { startFetchSourceQueue } from './queues/fetchSource';
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
  // Wired in dependency order: fetch-source enqueues into extract-events (spec §3 pipeline) -
  // extract-events started first so fetch-source's enqueue function is ready. process-event
  // (dedup, importance, storage) is Phase 5 and isn't wired up yet.
  const extractEventsQueue = await startExtractEventsQueue(redis, db, llmDeps, logger);
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
