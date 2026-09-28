import { z } from 'zod';
import type { LlmEnv } from '../config';

// Raw OpenRouter chat completion call. Uses `response_format: json_object` (plain JSON mode)
// rather than a strict json_schema response format: free-tier models have inconsistent
// support for schema-constrained output, so the contract this package actually relies on is
// "valid JSON, then Zod validates it" (CLAUDE.md: every LLM output is Zod-validated), not
// provider-side schema enforcement.
async function callOpenRouterChat(
  env: LlmEnv,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is required to call the LLM');

  const res = await fetchImpl(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'Competitive Intelligence Platform',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `OpenRouter ${res.status} ${res.statusText} (model ${model}): ${body.slice(0, 500)}`,
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error(`OpenRouter returned no content (model ${model})`);
  return content;
}

function parseJson(raw: string): unknown {
  // Models occasionally wrap JSON in a markdown code fence despite instructions - strip it
  // before parsing rather than failing the whole call over formatting.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(fenced ? fenced[1]! : raw);
}

export type LlmCache = {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown, meta: { promptVersion: string; model: string }): Promise<void>;
};

export type LlmFailureInfo = {
  task: string;
  promptVersion: string;
  model: string;
  input: unknown;
  rawOutput: string | undefined;
  error: string;
};

export type LlmDeps = {
  env: LlmEnv;
  cache?: LlmCache;
  onFailure?: (info: LlmFailureInfo) => Promise<void>;
  fetchImpl?: typeof fetch;
};

export type LlmCallParams<T> = {
  task: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  cacheKey?: string; // omit to skip caching (e.g. calls that should never be reused)
  loggedInput?: unknown; // what to record in llm_failures on a hard failure; defaults to userPrompt
};

// The flow in SYSTEM_DESIGN §9: cache -> call (main model) -> Zod validate -> retry once on
// main -> backup model once -> log to llm_failures and return null (caller skips the item;
// F4 convention: invalid output is retried then logged, never silently guessed).
export async function callLlmStructured<T>(
  deps: LlmDeps,
  params: LlmCallParams<T>,
): Promise<T | null> {
  const fetchImpl = deps.fetchImpl ?? fetch;

  if (params.cacheKey && deps.cache) {
    const cached = await deps.cache.get(params.cacheKey);
    if (cached !== undefined) {
      const result = params.schema.safeParse(cached);
      if (result.success) return result.data;
      // A cached value that no longer matches the schema (e.g. after a schema change) is
      // treated as a miss, not a crash.
    }
  }

  const attempts: { model: string }[] = [
    { model: deps.env.LLM_MODEL_MAIN },
    { model: deps.env.LLM_MODEL_MAIN }, // one retry on the main model (invalid JSON is often transient)
    { model: deps.env.LLM_MODEL_BACKUP },
  ];

  let lastRawOutput: string | undefined;
  let lastError = 'unknown error';

  for (const attempt of attempts) {
    try {
      const raw = await callOpenRouterChat(
        deps.env,
        attempt.model,
        params.systemPrompt,
        params.userPrompt,
        fetchImpl,
      );
      lastRawOutput = raw;
      const parsed = parseJson(raw);
      const result = params.schema.safeParse(parsed);
      if (result.success) {
        if (params.cacheKey && deps.cache) {
          await deps.cache.set(params.cacheKey, result.data, {
            promptVersion: params.promptVersion,
            model: attempt.model,
          });
        }
        return result.data;
      }
      lastError = `Schema validation failed: ${z.prettifyError(result.error)}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  await deps.onFailure?.({
    task: params.task,
    promptVersion: params.promptVersion,
    model: deps.env.LLM_MODEL_BACKUP,
    input: params.loggedInput ?? params.userPrompt,
    rawOutput: lastRawOutput,
    error: lastError,
  });
  return null;
}
