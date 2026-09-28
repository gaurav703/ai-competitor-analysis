import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// LLM output cache (SYSTEM_DESIGN §9): key = promptVersion + model + inputHash. Avoids paying
// for (and hitting free-tier rate limits on) the same extraction twice - e.g. a source that
// fetched clean but produced an identical diff to last time.
export const llmCache = pgTable('llm_cache', {
  cacheKey: text('cache_key').primaryKey(), // sha256(promptVersion:model:inputHash)
  promptVersion: text('prompt_version').notNull(),
  model: text('model').notNull(),
  output: jsonb('output').notNull(), // the validated (Zod-parsed) result, ready to reuse as-is
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export type LlmCacheRow = typeof llmCache.$inferSelect;
export type NewLlmCacheRow = typeof llmCache.$inferInsert;

// Failed-after-retry LLM calls (SYSTEM_DESIGN §4.3: "retry invalid JSON once, then write to
// extraction_failures"). Kept for debugging prompt/model quality, not surfaced to users.
export const llmFailures = pgTable(
  'llm_failures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id'),
    task: text('task').notNull(), // e.g. "extractEvents", "mapOffering"
    promptVersion: text('prompt_version').notNull(),
    model: text('model').notNull(),
    input: jsonb('input').notNull(),
    rawOutput: text('raw_output'), // whatever the model returned, if anything
    error: text('error').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('llm_failures_workspace_id_idx').on(t.workspaceId)],
).enableRLS();

export type LlmFailureRow = typeof llmFailures.$inferSelect;
export type NewLlmFailureRow = typeof llmFailures.$inferInsert;
