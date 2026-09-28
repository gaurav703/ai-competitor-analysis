import { z } from 'zod';

// LLM settings (D-002). Provider and models come from env so switching to a paid model is config only.
// Prompts, the llm wrapper and output schemas are added in Phase 4.
export const llmEnvSchema = z.object({
  LLM_PROVIDER: z.enum(['openrouter', 'anthropic']).default('openrouter'),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_BASE_URL: z.url().default('https://openrouter.ai/api/v1'),
  LLM_MODEL_MAIN: z.string().min(1).default('nvidia/nemotron-3-ultra-550b-a55b:free'),
  LLM_MODEL_BACKUP: z.string().min(1).default('google/gemma-4-26b-a4b-it:free'),
  EMBEDDING_MODEL: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type LlmEnv = z.infer<typeof llmEnvSchema>;

export function readLlmEnv(env: NodeJS.ProcessEnv = process.env): LlmEnv {
  return llmEnvSchema.parse(env);
}
