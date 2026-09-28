# Decision Log

Format: ID · date · status (Proposed / Accepted / Replaced) · decision · reason · alternatives rejected.

---

## D-001: Tech stack · 2026-09-17 · **Accepted**

| Area | Choice | Reason | Alternatives |
|---|---|---|---|
| Language | TypeScript (strict) | Required by spec §10; one language across web, worker and shared logic | Python: split stack |
| Web app | Next.js (App Router), Tailwind, shadcn/ui, Recharts | Full-stack, fast UI work, radar and scorecard charts | Remix, SvelteKit |
| Monorepo | pnpm workspaces: `apps/web`, `apps/worker`, `packages/{core,db,prompts}` | Shared domain types, scoring and config between web and worker | Turborepo-only, single app |
| Database | PostgreSQL on **Supabase** (free tier) + JSONB + pgvector | Relational queries for matrix, gaps and patterns; flexible event payloads; embeddings in the same DB; free hosting | MongoDB (considered 2026-09-17: comparison engine needs joins/aggregates; JSONB covers flexible data), Neon (no built-in auth), separate vector DB |
| ORM | Drizzle | Typed, SQL-close, light | Prisma |
| Jobs / queue | Node worker + BullMQ 6 + Redis (**Upstash** free tier) | Long fetch and LLM jobs with no serverless time limits; retries and schedules | Trigger.dev / Inngest (managed), pg-boss. Option: BullMQ 6 ships a Postgres backend, which could remove Redis later |
| LLM | **Replaced by D-002** (was: Claude Haiku 4.5 + Sonnet 5) | n/a | n/a |
| Fetching | fetch + Readability/cheerio; Playwright only for JS-rendered pages | Cheap by default, headless only where needed | Always headless (slow, costly) |
| Auth | **Supabase Auth** (email + password) via `@supabase/ssr` | Comes with the database; no roles needed in MVP | Auth.js, Clerk |
| Alerts | Resend (email), Telegram bot; Slack/WhatsApp post-MVP | Fast to ship | WhatsApp first (approval overhead) |
| Tests | Vitest | Fast, TS-native | Jest |
| Tooling | pnpm 11 via corepack, Node 22, TypeScript 6.0 (typescript-eslint supports <6.1), ESLint 9, Next.js 16 (`proxy.ts` replaces middleware) | Current, mutually compatible versions | TypeScript 7 / ESLint 10 (plugin support not ready) |

**Open:** hosting for deploy (Vercel for web + Railway/Fly for worker). LLM row replaced by D-002.

---

## D-002: LLM provider for MVP · 2026-09-17 · **Accepted**

**Decision:** Use **free models on OpenRouter** for the MVP. Decide on a paid model later, based on measured quality and limits.

| Role | Model (OpenRouter, free) | Why |
|---|---|---|
| Main (all tasks) | **NVIDIA Nemotron 3 Ultra**: `nvidia/nemotron-3-ultra-550b-a55b:free` | Largest free option (550B total / 55B active), 1M context, reasoning; MVP volume is low, so quality > speed |
| Backup | **Google Gemma 4 26B A4B**: `google/gemma-4-26b-a4b-it:free` | 3.8B active (fast), 262K context, text/image/video input; provider Google AI Studio: ~0.87s latency, ~32 tokens/s, 99.7% uptime (checked 2026-09-17) |
| Alternates | Gemma 4 31B (dense, stronger backup if 26B quality is too low), Nemotron 3.5 Lightning (high volume) | n/a |
| Rejected | Nemotron 3.5 Content Safety (guardrail only), Laguna S 2.1 (coding-focused), GLM 5.2 free (33K context too small for briefs) | n/a |

**How it's built (so switching is cheap):**

- One provider-agnostic `llm` wrapper in `packages/prompts`; provider and models come from env (`LLM_PROVIDER`, `LLM_MODEL_MAIN`, `LLM_MODEL_BACKUP`, `EMBEDDING_MODEL`).
- Structured output + Zod validation + 1 retry, then the backup model, then log the failure.
- `promptVersion` and model id are stored on every output; results are cached by prompt + model + input hash.

**Before relying on it (Phase 4):** confirm both models support structured outputs on OpenRouter, then run an eval of about 20 real labeled examples (pricing or menu diffs, news, reviews) and check JSON validity, event type and offering matching. If the main model fails, promote the backup or test the alternates.

**Reason:** $0 AI cost while building and testing the MVP.

**Risks accepted:** daily and per-minute rate limits on free models (buying $10 of credit raises the daily limit), models may disappear or change, weaker structured output than paid models, and free endpoints log prompts. **The NVIDIA free endpoint explicitly logs usage and forbids confidential or personal data**, so only public competitor content and non-sensitive profile info go to free models.

**Revisit and go paid when any of these happen:**

1. The Phase 4 eval or real use shows wrong or noisy events (precision goal not met).
2. Rate limits block the pipeline (jobs regularly delayed or failing).
3. Real users' private business data needs to be processed with no logging.
4. First paying customers or a public launch.

Paid candidates at that point: Claude Haiku 4.5 ($1 / $5 per 1M tokens) for volume + Claude Sonnet 5 ($2 / $10) for explanations and briefs, estimated at about $10–20 a month at MVP scale; or paid models on OpenRouter. Re-run the same eval before switching.

---

## D-003: Testing cadence for phases 1–4 · 2026-09-28 · **Accepted**

**Decision:** No manual/live-check gate on phases 1–4 (foundation, domain model & config, source monitoring, LLM extraction). These are infra/scaffold phases with no end-user-facing feature yet. A phase is done when lint, typecheck, tests and build pass and any automated/one-time infra check succeeds (e.g. worker connects to DB and Redis, migrations apply cleanly) — not when a human has walked through the UI.

Manual/live testing (e.g. the Phase 1 "sign up → confirm → log in → create workspace" browser walkthrough) resumes as a required step starting **Phase 5 onward**, once user-facing features begin shipping and there's an actual feature to validate by hand.

**Reason:** avoids blocking scaffold-only phases on manual steps that don't yet exercise any feature; keeps momentum through infra phases.

**Applied retroactively:** Phase 1 is marked done on infra verification alone (migration applied; worker logged `connected to database` / `connected to redis` / `worker started`; web app responded `200`) without the browser sign-up walkthrough.

---

## D-004: pgvector embedding dimension placeholder · 2026-09-28 · **Accepted**

**Decision:** `event.embedding` and `offering.embedding` (both used for dedup/offering-match similarity, spec §9) are `vector(768)`, using Drizzle's native `vector()` column type from `drizzle-orm/pg-core` (no extra package needed — confirmed present in drizzle-orm 0.45.2). The Postgres `vector` extension is enabled via `CREATE EXTENSION IF NOT EXISTS vector;`, added by hand to the top of `packages/db/drizzle/0001_nasty_post.sql` since Drizzle doesn't manage extensions.

**Reason:** D-002 leaves `EMBEDDING_MODEL` unset until Phase 4 picks a real free embedding model on OpenRouter. 768 matches common free embedding models (e.g. BGE-base, nomic-embed) and unblocks the Phase 2 schema now.

**Risk accepted:** pgvector fixes a column's dimension at creation. If the Phase 4 model choice needs a different size, that's a migration that drops and recreates both `embedding` columns (data loss on those two columns only, not the rows). Revisit when D-002's `EMBEDDING_MODEL` is actually set.

**Extended 2026-09-29 (Phase 4):** with `EMBEDDING_MODEL` still unset, the pgvector similarity tier isn't just unused - it's not implemented yet, in either place SYSTEM_DESIGN calls for it:

- Offering mapping (§6): the pipeline is alias match (exact, code) → LLM match → create new. The pgvector pre-filter step is replaced by a word-overlap (Jaccard) ranking in `packages/core/src/offerings/match.ts` (`rankOfferingCandidates`), which does the same job - narrow a large offering list to a short LLM-worthy candidate list - without needing embeddings.
- Event dedup (§5 F5): same substitution, once F5 is implemented - `dedupKey` (exact) plus a word-overlap similarity fallback, not `event.embedding`.

Both `embedding` columns stay in the schema, unpopulated, ready to wire in once a free embedding model is evaluated and confirmed. This is a real precision trade-off (word overlap misses paraphrases embeddings would catch) accepted to avoid picking an unvalidated embedding provider blind.
