import 'server-only';
import { createDb, type Database } from '@cip/db';
import { databaseUrl } from './env';

const globalForDb = globalThis as unknown as { cipDb?: Database };

// Reuse one pool across hot reloads in development.
export function getDb(): Database {
  if (!globalForDb.cipDb) {
    globalForDb.cipDb = createDb(databaseUrl(), { max: 5 }).db;
  }
  return globalForDb.cipDb;
}
