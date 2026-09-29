# Progress

Status: `todo` · `in-progress` · `done`. Phase details: `docs/ROADMAP.md`.

**Current phase:** Phase 8: Comparison engine & core views

**Testing cadence (D-003):** no manual/live-check gate on phases 1–4 — see `docs/DECISIONS.md`. Live/manual walkthroughs resume at Phase 5.

| Phase | Name | Features | Status |
|---|---|---|---|
| 0 | Project context | n/a | done |
| 1 | Foundation & project setup | n/a | done |
| 2 | Domain model & config | §4 | done |
| 3 | Source monitoring pipeline | F3 | done |
| 4 | LLM event extraction & offering taxonomy | F4 | done |
| 5 | Dedup, importance & timeline | F5, F6, F7 | done |
| 6 | Onboarding & source discovery | F1, F2 | done |
| 7 | Offering matrix, pricing & metrics | F8, F9 (part) | done |
| 8 | Comparison engine & core views | F9, F9b | in-progress |
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
- [x] Live end-to-end smoke test against real Supabase + Upstash + OpenRouter — see the Phase 5 checklist below

## Phase 5 checklist (F5, F6, F7)

- [x] Dedup (`packages/core/src/events/dedup.ts`): `buildDedupKey` (competitor + type + normalized subject + time window) + `textSimilarity`/`isLikelyDuplicate` word-overlap fallback (pgvector deferred, D-004)
- [x] Importance scoring (`packages/core/src/events/importance.ts`): wires Phase 2's `getEventTypeWeight`/`IMPORTANCE_ADJUSTMENTS`/`importanceLevelForScore` into `scoreImportance`, with a human-readable `reason` assembled from whichever rules fired
- [x] `events` repository (`packages/db/src/repositories/events.ts`): `createEvent` + evidence junction inserts, `getEventByDedupKey`, `listRecentEventsForCompetitorType` (similarity-fallback candidates), `listEventsForCompetitor` (timeline query, evidence resolved per event)
- [x] `process-event` job/queue: exact dedup key → merge; else similarity fallback → merge; else score importance and insert a real `Event` row with evidence links; re-validates the queued candidate with Zod (queue payloads aren't trusted just because they compiled once)
- [x] Competitor timeline UI (F7): `/workspaces/[id]/competitors` (list + add), `/competitors/new` (add-competitor form/action, minimal - full onboarding is Phase 6), `/competitors/[id]` (reverse-chronological timeline, type/importance filters via query params, evidence expandable per event via `<details>`)
- [x] Lint, format, typecheck (all 5 workspace projects), tests (41), web + worker builds all pass
- [x] **Live end-to-end smoke test** (D-003: Phase 5 is where manual/live checks resume) against real Supabase + Upstash + OpenRouter, using the Phase 2 seed data: real `fetch()` to a live URL → real hash/diff → 2-fetch confirmation → real Snapshot row; real OpenRouter call → Zod-validated `{"events": []}` (correct - the test page has no real business content) → cached in `llm_cache`; a manufactured realistic candidate run twice through `process-event` → first call created a real `Event` row (score 4 → `medium`, matching the formula exactly), second call correctly **merged** into the same row instead of duplicating (checked via a direct SQL query, not just the function's return value). The retry→backup→log-failure path was also exercised for real: `llm_failures` recorded two genuine free-tier 429s from the backup model before a later run's main-model call succeeded - exactly the D-002 risk, handled as designed, not simulated.
- [x] Bug fix surfaced by the live test: `llm_failures.model` always recorded the *backup* model regardless of which model actually produced the final failure; now tracks and logs the real last-attempted model

## Phase 6 checklist (F1, F2)

- [x] `extractProfile.v1` prompt + `businessProfileDraftSchema` (`packages/prompts`): draft offerings/pricing as plain text, not yet canonical rows - matches spec §5 F1 ("auto-extracted, then the user reviews and edits it")
- [x] Onboarding profile flow (`/workspaces/[id]/profile`): website (optional) + description → real homepage fetch (own minimal fetch + cheerio strip + SSRF guard, duplicated from `apps/worker` - apps can't import each other's source in this monorepo) → LLM draft → editable review form (offerings/pricing as one-line-each text, simpler than a dynamic add/remove UI) → save creates real `Offering` and `price_entries` rows and stores the validated `BusinessProfile` on `workspaces.business_profile`
- [x] Source discovery (F2): `/workspaces/[id]/sources` (self/own-business monitoring) and `/workspaces/[id]/competitors/[id]/sources` (per competitor) share one component - suggested types come from Phase 2's `getSuggestedSourceTypes(industryCategory)`, already-added types are excluded, a blank URL means "skip"; add-competitor now flows straight into its sources page instead of an empty timeline
- [x] New repo functions: `saveBusinessProfile`, `listSourcesForSubject`, `createPriceEntry`/`listPriceEntries` (price entries are real relational rows, scoped by subjectType/subjectId - not just embedded JSONB - so Phase 7/8's price comparison queries will actually see them)
- [x] Lint, format, typecheck (all 5 workspace projects), tests (41), web + worker builds all pass
- [x] **Live end-to-end smoke test** against real Supabase + a real OpenRouter call, using the Phase 2 seed data (Demo: Spice Route Kitchen): a real fetch to a live URL → real text extraction; a real `extractProfile` call → a genuinely sensible, non-fabricated draft (correctly pulled "North Indian thalis", "Biryani", "Home delivery" from a one-line test description, left pricing empty since none was stated); saving created real `Offering` rows, real `price_entries` rows, and a real `workspaces.business_profile` value; a real self-monitoring `Source` row was created and confirmed via a direct query
- [x] Bug fix surfaced by the live test: `extractProfile` occasionally returns `targetCustomers: ""` instead of omitting an unstated field - `businessProfileDraftSchema` now normalizes empty string to `undefined`

## Phase 7 checklist (F8, F9 first part)

- [x] Closed a real gap from Phase 5: `process-event` never implemented the pipeline's "Apply: update prices" step (SYSTEM_DESIGN §4.1) - a `pricing_change` event with `structured.newPrice`/`currency` now creates a real competitor `price_entries` row, not just an `events.structured` blob nobody reads
- [x] Offering matrix (F8, `getOfferingMatrix` + `/workspaces/[id]/matrix`): offerings × (self + each competitor), yes/no/unknown. Self comes from `businessProfile.offerings`; a competitor is "yes" unless the *latest* event touching that offering is `offering_removed` (then "no"); no evidence at all → "unknown", never guessed. Every yes/no cell expands to the event(s) and source URL(s) behind it
- [x] Price position view (F8, `getPricePositions` + `/workspaces/[id]/prices`): latest price per subject per offering (price_entries is append-only, like MetricValue), grouped by offering, no cross-currency conversion (spec §9 flags that as a hard problem to stay precise about, not silently convert)
- [x] MetricValue self-entry (F9 first part, `/workspaces/[id]/metrics`): one form per built-in metric (Phase 2's `getMetricDefinitions`), grouped by dimension. Boolean fields use a tri-state select (Unknown/Yes/No), not a checkbox - a real bug caught before it shipped: an unchecked checkbox is indistinguishable from "never touched this field", so defaulting it to `false` on every save would have been exactly the guessing spec §9 forbids
- [x] Scope decision, documented not silently skipped: competitor `MetricValue` **auto-extraction** (a dedicated `extractMetrics` LLM prompt + worker job) is deferred - not in Phase 7's stated build list, and a real separate feature. Competitor metrics correctly show as unknown until it exists
- [x] Lint, format, typecheck (all 5 workspace projects), tests (41), web + worker builds all pass
- [x] **Live end-to-end smoke test** against real Supabase, using the Phase 2 seed data (Demo: Flowly / Zapier): a real `process-event` call with a real offering link scored **6 → "high"** (base weight 4 + the "touches an offering you don't have" +2 adjustment - proves the importance formula correctly reads real offering-ownership data, not just a synthetic test); the new price-entry fix created a real competitor row, confirmed alongside the existing self row in the same price position group; the offering matrix showed a real "yes" with real evidence linking to the real event and source URL; two `MetricValue` inserts for the same metric confirmed "latest wins" (the correction, not the original, was returned) - all checked via direct queries, not trusted return values

## Last session

- **2026-09-17:** Phase 0 done. Created `CLAUDE.md`, the spec, roadmap, progress tracker and decision log.
- **2026-09-17:** Added `docs/SYSTEM_DESIGN.md`. D-002 accepted: free OpenRouter models, switchable by env.
- **2026-09-17:** D-001 accepted (Postgres on Supabase over MongoDB). Phase 1 scaffold built and all local checks pass. Not yet run against a real database or Redis.
- **2026-09-28:** Supabase + Upstash set up, `.env` filled, `pnpm db:migrate` run. Fixed a real bug in `apps/web/next.config.ts`: `@next/env`'s `loadEnvConfig` was returning a stale process-wide empty cache (Next's dev server pre-loads env for `apps/web`, which has no `.env` files, before `next.config.ts` runs) — fixed with `forceReload: true`. Verified worker connects to DB + Redis and web responds. D-003 accepted: no manual/live-check gate on phases 1–4; deferred the browser sign-up walkthrough to Phase 5. Phase 1 marked done. First commit made and pushed to GitHub.
- **2026-09-28:** Phase 2 done. Domain Zod schemas for all §4 entities; config for dimensions, thresholds, importance (with per-industry overrides), source suggestions and built-in metrics (food_hospitality + software, all 10 dimensions). Drizzle schema for all 22 tables incl. join tables, `workspace_id` + RLS on every one; pgvector enabled (D-004: `vector(768)` placeholder). Migration generated and applied to Supabase. Seed script creates a demo workspace per industry, idempotent, runs the full config → DB chain. Caught and fixed two real bugs along the way: a metric-id collision across the two industry configs (would have silently shadowed one definition) and a zod v4 `record()` vs `partialRecord()` mistake (exhaustive-key validation failing on intentionally-sparse per-industry override maps). Lint/format/typecheck (all 5 projects)/tests (19)/build all pass.
- **2026-09-29:** Phase 3 done: `SourceAdapter` interface + website/Google News/Play Store adapters, robots.txt + per-domain rate limiting, 2-fetch confirmation, source health/backoff, `fetch-source` queue. Phase 4 done: OpenRouter LLM wrapper with retry→backup→log-failure, `llm_cache`/`llm_failures` tables + migration, `extractEvents.v1`/`mapOffering.v1` prompts, offering mapping (alias → LLM → create new), `extract-events` queue producing validated candidate events. D-004 extended: pgvector similarity deferred for both offering matching and (later) event dedup - a word-overlap pre-filter stands in for it. Started Phase 5 (dedup, importance scoring, process-event, events repo, timeline UI) then rolled it back on request to land 3+4 first; that work is not in this commit and will be redone. Caught real bugs along the way: an `@cip/core`/`@cip/db` type-name collision on `Source` (Zod input type vs DB row, same name, different nullability) that the type system correctly rejected; a `gplay.sort` typing gap in `google-play-scraper`'s own `.d.ts`; a broken sync `items()` adapter method for an inherently-async RSS parse (fixed by making the interface method itself async, not by working around it). Lint/format/typecheck (5 projects)/tests (30)/build all pass. No live smoke test yet (no fetch has been run against a real source or OpenRouter).
- **2026-09-29:** Phase 5 done: dedup (exact key + word-overlap similarity fallback), importance scoring (wired to Phase 2's config), `process-event` job/queue (dedup → score → store), competitor timeline UI (F7) with type/importance filters and expandable evidence, minimal add-competitor flow. Ran a real live end-to-end smoke test (D-003: Phase 5 resumes manual/live checks) against Supabase + Upstash + OpenRouter using the Phase 2 seed data: real fetch → real Snapshot, real OpenRouter call → validated + cached, a manufactured candidate run twice through process-event created one real Event row then correctly merged the second call into it (verified with a direct SQL check, not just trusting the return value). Also exercised the failure path for real: two genuine free-tier 429s got logged to `llm_failures` before a later call succeeded - the exact risk D-002 flagged, handled as designed. Fixed a real bug the live test surfaced: `llm_failures.model` always logged the backup model even when the main model was what actually failed last. Lint/format/typecheck (5 projects)/tests (41)/build all pass.
- **2026-09-29:** Phase 6 done: business profile onboarding (website/description → real fetch → LLM draft → review/edit → save as real Offering + price_entries rows + workspace.business_profile) and industry-aware source discovery (shared suggestion UI for both self-monitoring and per-competitor sources, built on Phase 2's `getSuggestedSourceTypes`). Ran a real live smoke test against Supabase + OpenRouter: real fetch, a real extraction call that produced a genuinely sensible (not fabricated) draft, real DB writes for offerings/prices/profile/sources. Fixed a real bug the live test surfaced: the LLM sometimes returns `targetCustomers: ""` instead of omitting it; the schema now normalizes that. Lint/format/typecheck (5 projects)/tests (41)/build all pass.
- **2026-09-29:** Phase 7 done: offering matrix, price position view, self-service metric-value entry. Fixed a real gap from Phase 5 first: process-event never actually populated price_entries for competitors (the pipeline's "Apply" step per SYSTEM_DESIGN §4.1 had been skipped). Live smoke test against Supabase confirmed all of it for real, including the importance formula correctly scoring an event higher (6 → "high") because it touched an offering the demo business doesn't have. Caught and fixed a design bug before it shipped: metric boolean fields needed a tri-state control, not a checkbox, since "unchecked" and "never touched" aren't the same thing and conflating them would have silently written false guesses. Lint/format/typecheck (5 projects)/tests (41)/build all pass.
- **Next step:** Phase 8 — comparison engine & core views (F9, F9b): deterministic `ComparisonResult` per metric (lagging/at_par/leading/unique/unknown, per SYSTEM_DESIGN §7.1), dimension scores + overall weighted score + rank (§7.2), `LagItem`/`StrengthItem` generation with the priority formula (§7.3, offering gaps included), and the scorecard/lagging/leading views. The LLM only writes the explanation and "look into" line - status and scoring stay deterministic code.
