import { describe, expect, it } from 'vitest';
import { readLlmEnv } from './config';

describe('readLlmEnv', () => {
  it('uses the D-002 free models by default', () => {
    const env = readLlmEnv({});
    expect(env.LLM_PROVIDER).toBe('openrouter');
    expect(env.LLM_MODEL_MAIN).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
    expect(env.LLM_MODEL_BACKUP).toBe('google/gemma-4-26b-a4b-it:free');
    expect(env.EMBEDDING_MODEL).toBeUndefined();
  });

  it('lets env override the models', () => {
    const env = readLlmEnv({ LLM_MODEL_MAIN: 'some/paid-model', EMBEDDING_MODEL: '' });
    expect(env.LLM_MODEL_MAIN).toBe('some/paid-model');
    expect(env.EMBEDDING_MODEL).toBeUndefined();
  });
});
