# Progress

Status: `todo` · `in-progress` · `done`. Phase details: `docs/ROADMAP.md`.

**Current phase:** Phase 5: Dedup, importance & timeline

**Testing cadence (D-003):** no manual/live-check gate on phases 1–4 — see `docs/DECISIONS.md`. Live/manual walkthroughs resume at Phase 5.

| Phase | Name | Features | Status |
|---|---|---|---|
| 0 | Project context | n/a | done |
| 1 | Foundation & project setup | n/a | done |
| 2 | Domain model & config | §4 | done |
| 3 | Source monitoring pipeline | F3 | done |
| 4 | LLM event extraction & offering taxonomy | F4 | done |
| 5 | Dedup, importance & timeline | F5, F6, F7 | in-progress |
| 6 | Onboarding & source discovery | F1, F2 | todo |
| 7 | Offering matrix, pricing & metrics | F8, F9 (part) | todo |
| 8 | Comparison engine & core views | F9, F9b | todo |
| 9 | Patterns & review intelligence | F10, F11 | todo |
| 10 | Alerts, brief, dashboard & validation | F12, F13, F14 | todo |

## Phase 1 checklist

- [x] Confirm tech stack (D-001 accepted: Supabase Postgres + Supabase Auth, Upstash Redis)
- [x] pnpm monorepo: `apps/web`, `apps/worker`, `packages/core`, `packages/db`, `packages/prompts`
- [x] Next.js 16 + TS strict + Tailwind 4 + shadcn/ui-style components (`components.json` ready for `shadcn add`)
- [x] Drizzle schema (`workspaces`, RLS enabled) + first migration `packages/db/drizzle/0000_init.sql`
- [x] Auth pages: sign up, log in, log out, email-confirm callback, route protection in `src/proxy.ts`
- [x] Create workspace flow + dashboard list + workspace page (owner-scoped queries)
- [x] Worker: env check, DB ping, Redis ping, BullMQ `system` queue with heartbeat scheduler
- [x] ESLint, Prettier, Vitest (6 tests), `.env.example`, GitHub Actions CI
- [x] Lint, format, typecheck, tests, web + worker builds all pass locally
- [x] **User:** created Supabase project + Upstash Redis, filled `.env`
- [x] Ran `pnpm db:migrate` against Supabase
- [x] Verified: worker logs "connected to database", "connected to redis", "worker started"; web app responds 200
- [x] First git commit (`3e27ead`), pushed to `github.com/gaurav703/ai-competitor-analysis`
- [ ] Deferred to Phase 5 (D-003): browser walkthrough — sign up → confirm email → log in → create workspace → see it on dashboard

## Phase 2 checklist

- [x] Domain Zod schemas for every §4 entity in `packages/core/src/domain/` (shared/evidence, businessProfile, catalog, monitoring, event, metric, insights) + barrel export
- [x] Config: `dimensions.ts` (10 fixed dims + default weights), `thresholds.ts`, `importance.ts` (base weights + per-industry overrides), `sources.ts` (industry → suggested source types), `metrics.ts` (built-in `MetricDefinition`s for food_hospitality + software, covering all 10 dimensions, no duplicate ids across industries)
- [x] Drizzle schema for all §4 entities (22 tables: workspaces + business_profile column, competitors, sources, snapshots, offerings, price_entries, events + 3 join tables, metric_definitions, metric_values, comparison_results, scorecards, lag_items + join, strength_items, gaps, patterns + join, review_themes, briefs) — every table carries `workspace_id` and `.enableRLS()`
- [x] pgvector: `vector(768)` on `event.embedding` / `offering.embedding`; `CREATE EXTENSION IF NOT EXISTS vector` added to the migration by hand (D-004 — dimension is a placeholder pending Phase 4's embedding model choice)
- [x] Migration generated (`0001_nasty_post.sql`) and applied to Supabase
- [x] Seed script (`pnpm db:seed`): creates one demo workspace per Phase-2 industry (restaurant, B2B SaaS) with competitors, offerings, a source, a price entry and a metric value; idempotent (skips if already seeded); exercises `getMetricDefinitions`/`getSuggestedSourceTypes` from config
- [x] Unit tests for the new config (dimensions, metrics, importance) — 19 tests total, all passing
- [x] Lint, format, typecheck (all 5 workspace projects), tests, web + worker builds all pass

## Phase 3 checklist (F3)

- [x] `SourceAdapter` interface (`apps/worker/src/adapters/types.ts`): fetch/normalize/diff/items
- [x] Website adapter: fetch (with an SSRF guard blocking private/internal IPs) + Readability/cheerio normalization (strips nav, footer, cookie banners, timestamps, scripts) + line diff
- [x] Google News adapter: RSS feed parsing, new items by guid/link
- [x] Play Store reviews adapter (chosen over Google Business/Places — no API key needed): new reviews by id
- [x] robots.txt check (cached per-origin) + per-domain rate limit (Redis, 1 req/10s) with proper BullMQ `DelayedError` rescheduling (not a busy-wait)
- [x] 2-fetch confirmation before a website diff becomes a Snapshot (config: `THRESHOLDS.websiteConfirmFetches`)
- [x] Source health: `errorCount` + `unhealthy` status after N failures (config-driven), resets on next success
- [x] `fetch-source` queue: repeatable scanner (scans active sources due by type-specific interval) + per-source fetch jobs; one source's failure never blocks another (per-job isolation)
- [x] Fixture-based adapter tests proving F3's done-when directly: a cosmetic change (cookie banner text, footer year, session-id script) produces no diff; a real content change (a price) does
- [x] Deferred, documented rather than faked: Playwright fallback for JS-rendered pages (throws a clear error instead of silently returning an empty page); `app_store`/`google_business`/`marketplace_listing`/`reddit`/`rss`/`jobs`/`social` adapters (MVP scope is website-shaped sources + Google News + Play Store)

## Phase 4 checklist (F4)

- [x] OpenRouter LLM client wrapper (`packages/prompts/src/llm/client.ts`): JSON-mode call → Zod validate → retry once on main model → backup model → log to `llm_failures` and return null (never guesses)
- [x] Content-hash result caching (`llm_cache` table, key = promptVersion + model + inputHash)
- [x] Versioned prompts: `extractEvents.v1` (diff or new-item → typed events with type-specific `structured` fields), `mapOffering.v1` (mention + candidates → matched id or null)
- [x] Offering mapping pipeline: alias match (exact, code) → LLM match against a word-overlap-ranked shortlist → create new; matched mentions get added as a new alias automatically
- [x] `extract-events` queue/job: snapshot + previous → diff → cache check → LLM extract → Zod validate → map offerings → candidate events (logged; not yet stored — storage/dedup/importance is Phase 5's `process-event` step per SYSTEM_DESIGN §4.3)
- [x] Deferred, documented rather than faked (D-004): the pgvector similarity tier of offering matching — no free embedding model has been evaluated yet, so a word-overlap (Jaccard) pre-filter stands in for it
- [x] Lint, format, typecheck (all 5 workspace projects), tests (30), web + worker builds all pass
- [ ] Not yet done: a live end-to-end smoke test (real fetch → real OpenRouter call) — infra is verified, the actual pipeline hasn't been run against a live source yet

## Last session

- **2026-09-17:** Phase 0 done. Created `CLAUDE.md`, the spec, roadmap, progress tracker and decision log.
- **2026-09-17:** Added `docs/SYSTEM_DESIGN.md`. D-002 accepted: free OpenRouter models, switchable by env.
- **2026-09-17:** D-001 accepted (Postgres on Supabase over MongoDB). Phase 1 scaffold built and all local checks pass. Not yet run against a real database or Redis.
- **2026-09-28:** Supabase + Upstash set up, `.env` filled, `pnpm db:migrate` run. Fixed a real bug in `apps/web/next.config.ts`: `@next/env`'s `loadEnvConfig` was returning a stale process-wide empty cache (Next's dev server pre-loads env for `apps/web`, which has no `.env` files, before `next.config.ts` runs) — fixed with `forceReload: true`. Verified worker connects to DB + Redis and web responds. D-003 accepted: no manual/live-check gate on phases 1–4; deferred the browser sign-up walkthrough to Phase 5. Phase 1 marked done. First commit made and pushed to GitHub.
- **2026-09-28:** Phase 2 done. Domain Zod schemas for all §4 entities; config for dimensions, thresholds, importance (with per-industry overrides), source suggestions and built-in metrics (food_hospitality + software, all 10 dimensions). Drizzle schema for all 22 tables incl. join tables, `workspace_id` + RLS on every one; pgvector enabled (D-004: `vector(768)` placeholder). Migration generated and applied to Supabase. Seed script creates a demo workspace per industry, idempotent, runs the full config → DB chain. Caught and fixed two real bugs along the way: a metric-id collision across the two industry configs (would have silently shadowed one definition) and a zod v4 `record()` vs `partialRecord()` mistake (exhaustive-key validation failing on intentionally-sparse per-industry override maps). Lint/format/typecheck (all 5 projects)/tests (19)/build all pass.
- **2026-09-29:** Phase 3 done: `SourceAdapter` interface + website/Google News/Play Store adapters, robots.txt + per-domain rate limiting, 2-fetch confirmation, source health/backoff, `fetch-source` queue. Phase 4 done: OpenRouter LLM wrapper with retry→backup→log-failure, `llm_cache`/`llm_failures` tables + migration, `extractEvents.v1`/`mapOffering.v1` prompts, offering mapping (alias → LLM → create new), `extract-events` queue producing validated candidate events. D-004 extended: pgvector similarity deferred for both offering matching and (later) event dedup - a word-overlap pre-filter stands in for it. Started Phase 5 (dedup, importance scoring, process-event, events repo, timeline UI) then rolled it back on request to land 3+4 first; that work is not in this commit and will be redone. Caught real bugs along the way: an `@cip/core`/`@cip/db` type-name collision on `Source` (Zod input type vs DB row, same name, different nullability) that the type system correctly rejected; a `gplay.sort` typing gap in `google-play-scraper`'s own `.d.ts`; a broken sync `items()` adapter method for an inherently-async RSS parse (fixed by making the interface method itself async, not by working around it). Lint/format/typecheck (5 projects)/tests (30)/build all pass. No live smoke test yet (no fetch has been run against a real source or OpenRouter).
- **Next step:** Phase 5 — dedup (F5), importance scoring (F6, wiring Phase 2's config), competitor timeline UI (F7), and a minimal "add competitor" flow (full onboarding is Phase 6). Then a live smoke test: real source → real OpenRouter call → see a candidate event.
