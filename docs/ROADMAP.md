# MVP Roadmap: 10 Phases

Feature IDs (F1–F15) and section numbers (§) refer to `docs/PROJECT_SPEC.md`. Track status in `docs/PROGRESS.md`.

## MVP scope

- **Industries:** `food_hospitality` (restaurant) and `software` (B2B SaaS), to prove the core is industry-agnostic.
- **Source adapters:** website pages (incl. pricing and menu), Google News RSS, and one review source (Google Business via the Places API, or Play Store).
- **Alert channels:** email + Telegram.
- **Out of MVP:** F15 Ask the intelligence, Slack/WhatsApp alerts, team roles, billing, mobile, scraping behind logins.

---

## Phase 0: Project context _(done)_

- **Build:** `CLAUDE.md`, `docs/PROJECT_SPEC.md`, `docs/ROADMAP.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`.
- **Done when:** a new chat knows what we're building and what's next without the spec being pasted.

## Phase 1: Foundation & project setup

- **Build:** pnpm monorepo (`apps/web`, `apps/worker`, `packages/core`, `packages/db`, `packages/prompts`); Next.js + TS strict; Tailwind + shadcn/ui; Postgres + Drizzle; auth; ESLint/Prettier; Vitest; `.env` handling; basic CI.
- **Done when:** a user can sign up, log in and create an empty workspace; the worker starts and connects to DB and Redis.

## Phase 2: Domain model & config

- **Build:** DB schema for all §4 entities; shared Zod types in `packages/core`; config for the 10 dimensions and default weights, industry → sources, industry → metrics (2 industries), importance weights, thresholds; seed script.
- **Done when:** migrations run, seed creates a demo workspace per industry, and config loads with type checks.

## Phase 3: Source monitoring pipeline (F3)

- **Build:** `SourceAdapter` interface; website, Google News and review adapters; normalization (Readability, stripping nav, footers, banners, timestamps); content hash; Snapshot on change; BullMQ scheduled jobs; per-domain rate limit; robots.txt; source health and backoff; Playwright fallback only for JS pages.
- **Done when:** a cosmetic change gives no diff, a real change creates a Snapshot, and one failing source doesn't block the others.

## Phase 4: LLM event extraction & offering taxonomy (F4)

- **Build:** versioned prompts in `packages/prompts`; model check (≈20 real labeled examples, compare candidate free models, confirm D-002 main/backup); diff → typed `Event` via structured output; Zod validation, retry, then log; type-specific `structured` fields; offering mapping (alias match → pgvector similarity → LLM match → create new); cache by content hash; `promptVersion` stored.
- **Done when:** real diffs from both industries become valid Events linked to snapshots and canonical Offerings.

## Phase 5: Dedup, importance & competitor timeline (F5, F6, F7)

- **Build:** `dedupKey` + similarity fallback that merges sources into one Event; rule-based importance with industry weights and adjustments (user has or lacks offering, region, pattern) plus `importanceReason`; per-competitor timeline UI with filters and evidence expansion.
- **Done when:** one real-world development appears once with all its sources, and every event shows importance, a reason and proof.

## Phase 6: Onboarding & source discovery (F1, F2)

- **Build:** onboarding wizard (business info, industry, region); LLM auto-extraction of the business profile, then user review and edit; add competitors; industry-based source suggestions from config that the user confirms or edits; monitoring of the user's own sources.
- **Done when:** a restaurant owner and a SaaS founder can each finish setup in a few minutes with a reviewed profile, competitors and sources.

## Phase 7: Offering matrix, pricing & metric collection (F8, first part of F9)

- **Build:** offering matrix (yes / no / unknown, evidence links); price comparison per equivalent offering (currency and unit aware); `MetricValue` collection across the 10 dimensions; user entry and correction of own values; origin, confidence and evidence on every value; user corrections override the LLM and feed aliases.
- **Done when:** the matrix and metric values are current, traceable, and show unknowns as unknown.

## Phase 8: Comparison engine & core views (F9, F9b, §2A)

- **Build:** deterministic `ComparisonResult` per metric; scorecard 0–100 per dimension that excludes unknowns and shows coverage; weighted overall score and rank, with history; LagItems (incl. offering gaps, N ≥ 2) and StrengthItems; configurable priority formula; LLM writes only the explanation and the "look into" line; dismiss or addressed states; daily recompute plus recompute on change. Views: scorecard table + radar, lagging report, leading report, head-to-head, price position map, missing data panel, progress over time.
- **Done when:** for a real business in each industry, a non-technical owner understands where they're behind and why in under 2 minutes, with evidence on every item.

## Phase 9: Pattern detection & review intelligence (F10, F11)

- **Build:** code-based grouping of events across competitors in a 90-day window with thresholds (≥3 competitors or ≥50%), LLM summary only; review collection and clustering into positive and negative themes with counts and excerpts; opportunity and risk flags; review themes feed the LagItem "customer signal".
- **Done when:** "X of Y competitors did Z in N days" insights and top review themes per competitor appear with linked evidence.

## Phase 10: Alerts, weekly brief, dashboard & MVP validation (F12, F13, F14)

- **Build:** real-time alerts for `high` events (email + Telegram) in the format what changed → why it matters → your status → source, following workspace settings; scheduled weekly Brief stored and emailed; dashboard home (scorecard + rank, top 5 lag items, important changes, strengths, patterns, reviews). Then run end-to-end with 2 real businesses per industry for 2+ weeks and tune noise and thresholds.
- **Done when:** the pipeline runs with no manual steps from source change to alert, brief and dashboard, and test users find the feed low-noise and the lag list correct.

---

## Post-MVP

F15 Ask the intelligence · Slack and WhatsApp alerts · more adapters and industries · team roles · billing.
