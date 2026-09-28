import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit always runs from packages/db.
config({ path: resolve(process.cwd(), '../../.env'), quiet: true });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    // Migrations need a session connection (port 5432); the app uses the transaction pooler (6543).
    url: process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL || '',
  },
  // Supabase manages its own schemas (auth, storage, ...). Only touch ours.
  schemaFilter: ['public'],
  strict: true,
  verbose: true,
});
