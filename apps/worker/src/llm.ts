import { readLlmEnv } from '@cip/prompts';
import type { LlmDeps } from '@cip/prompts';
import type { Database } from '@cip/db';
import { getLlmCacheEntry, recordLlmFailure, setLlmCacheEntry } from '@cip/db';

export function createLlmDeps(db: Database): LlmDeps {
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
