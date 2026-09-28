import 'server-only';
import type { LlmDeps } from '@cip/prompts';
import { readLlmEnv } from '@cip/prompts';
import { getLlmCacheEntry, recordLlmFailure, setLlmCacheEntry } from '@cip/db';
import { getDb } from './db';

// Same wiring as apps/worker/src/llm.ts - onboarding's profile extraction is a synchronous,
// user-facing LLM call (the wizard is waiting on it), so it runs directly in a server action
// instead of going through the worker's job queue.
export function createLlmDeps(): LlmDeps {
  const db = getDb();
  return {
    env: readLlmEnv(),
    cache: {
      get: (key) => getLlmCacheEntry(db, key),
      set: (key, value, meta) => setLlmCacheEntry(db, key, meta.promptVersion, meta.model, value),
    },
    onFailure: (info) =>
      recordLlmFailure(db, {
        task: info.task,
        promptVersion: info.promptVersion,
        model: info.model,
        input: info.input,
        rawOutput: info.rawOutput ?? null,
        error: info.error,
      }),
  };
}
