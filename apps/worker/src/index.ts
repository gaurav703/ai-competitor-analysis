import { createDb, pingDb } from '@cip/db';
import { readEnv } from './env';
import { logger } from './logger';
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

  const systemQueue = await startSystemQueue(redis, logger);
  logger.info('worker started');

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
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
