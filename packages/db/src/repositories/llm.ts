import { eq } from 'drizzle-orm';
import { sha256Hex } from '@cip/core';
import type { Database } from '../client';
import { llmCache, llmFailures, type NewLlmFailureRow } from '../schema';

export function llmCacheKey(promptVersion: string, model: string, inputHash: string): string {
  return sha256Hex(`${promptVersion}:${model}:${inputHash}`);
}

export async function getLlmCacheEntry(
  db: Database,
  cacheKey: string,
): Promise<unknown | undefined> {
  const [row] = await db
    .select({ output: llmCache.output })
    .from(llmCache)
    .where(eq(llmCache.cacheKey, cacheKey))
    .limit(1);
  return row?.output;
}

export async function setLlmCacheEntry(
  db: Database,
  cacheKey: string,
  promptVersion: string,
  model: string,
  output: unknown,
): Promise<void> {
  await db
    .insert(llmCache)
    .values({ cacheKey, promptVersion, model, output })
    .onConflictDoUpdate({ target: llmCache.cacheKey, set: { output } });
}

export async function recordLlmFailure(db: Database, input: NewLlmFailureRow): Promise<void> {
  await db.insert(llmFailures).values(input);
}
