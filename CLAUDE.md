# CLAUDE.md: Competitive Intelligence Platform

Short context, loaded every chat. Details are in `docs/`. **Read a doc only when the task needs it.**

| Need | File |
|---|---|
| Full spec (problem, §2A comparison, §4 domain model, §5 features, §9 hard problems) | `docs/PROJECT_SPEC.md` |
| System design (architecture, pipeline, ER model, comparison engine rules, LLM layer, jobs, user diagrams) | `docs/SYSTEM_DESIGN.md` |
| 10-phase MVP plan (build + done-when per phase) | `docs/ROADMAP.md` |
| Current phase, checklist, last session | `docs/PROGRESS.md` |
| Tech stack and decisions | `docs/DECISIONS.md` |

**Session rules:** before implementation work, read `docs/PROGRESS.md`. At the end of a session, update its checklist and "Last session". Record new architecture decisions in `docs/DECISIONS.md`.

## What it is

An AI competitive intelligence platform for **any business type** (SaaS, D2C, restaurants, services, manufacturing, real estate, and more). The user describes their business and competitors. The platform monitors public sources, turns changes into structured events, and compares them with the user's business. The core question it answers: **"Where am I lagging, where am I leading, what should I look into?"** Every claim comes with evidence.

**Problem:** signals are fragmented, existing tools report changes without meaning, and nothing ties changes to the user's business. **Users:** SMB owners, founders, PMs and marketers tracking 3–15 competitors with no analyst.

## Design principles

- Industry-agnostic core; industry only changes config (sources, metrics, weights, prompt hints).
- Precision over recall: when unsure, log but don't alert.
- Every insight links to evidence (source URL + snapshot or excerpt).
- Suggest investigations ("evaluate X"), never decisions.
- Structured data first, LLM second: the LLM classifies, extracts and explains; scoring, status, gaps and patterns are deterministic code.
- Unknown metrics stay **unknown**: never guessed, never counted as 0.

## Pipeline (each step independent + idempotent)

Sources → Fetch → Normalize → Hash diff → Dedup → LLM classify/extract → Event → Importance → Timeline → Offering matrix + MetricValues → Comparison engine → Patterns → Alerts / Weekly brief / Dashboard

## Core entities (types in spec §4)

Workspace · BusinessProfile · Competitor · Source · Snapshot · Event · **Offering** (central: anything comparable, with aliases) · PriceEntry · Dimension (10 fixed: offerings, pricing, customer_experience, reputation, digital_presence, marketing, channels, innovation, growth, trust) · MetricDefinition · MetricValue (origin, confidence, evidence) · ComparisonResult (lagging / at_par / leading / unique / unknown) · Scorecard · LagItem · StrengthItem · Gap · Pattern · ReviewTheme · Brief

## Features (spec §5)

F1 Onboarding + profile extraction · F2 Industry-aware source discovery · F3 Source monitoring · F4 LLM event extraction · F5 Dedup · F6 Importance · F7 Timeline · F8 Offering matrix + prices · **F9 Comparison engine (core)** · F9b Comparison views · F10 Patterns · F11 Review intelligence · F12 Alerts · F13 Weekly brief · F14 Dashboard · F15 Ask (post-MVP)

## MVP phases (details in `docs/ROADMAP.md`)

0 Context ✅ · 1 Foundation (code done, live check pending) · 2 Domain model + config · 3 Monitoring (F3) · 4 Event extraction + taxonomy (F4) · 5 Dedup/importance/timeline (F5–F7) · 6 Onboarding (F1–F2) · 7 Matrix + metrics (F8) · 8 Comparison engine + views (F9, F9b) · 9 Patterns + reviews (F10–F11) · 10 Alerts/brief/dashboard + validation (F12–F14)

MVP scope: 2 industries (restaurant, B2B SaaS) · 3 adapters (website, Google News, one review source) · email + Telegram alerts.

## Non-goals

Scraping behind logins or against platform terms · paid or private data · telling users what to do · roles and billing · mobile.

## Tech stack (D-001, accepted)

TypeScript strict · pnpm monorepo (`apps/web`, `apps/worker`, `packages/core`, `packages/db`, `packages/prompts`) · Next.js + Tailwind + shadcn/ui + Recharts · Postgres on Supabase (+ Supabase Auth) + JSONB + pgvector · Drizzle · BullMQ + Redis (Upstash) worker · LLM via OpenRouter free models (D-002: main `nvidia/nemotron-3-ultra-550b-a55b:free`, backup `google/gemma-4-26b-a4b-it:free`; free endpoints log prompts, so no confidential data; provider/model set by env, paid later) + Zod · Readability/cheerio, Playwright only when needed · Vitest

## Commands (pnpm via `corepack pnpm` if `pnpm` isn't on PATH)

`pnpm dev` (web + worker) · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build` · `pnpm format` · `pnpm db:generate` (after schema changes) · `pnpm db:migrate`. One `.env` at repo root (see `.env.example`). Web: Next.js 16, so `src/proxy.ts` not middleware; check `apps/web/node_modules/next/dist/docs` for current APIs.

## Conventions

- TS strict. **Every LLM output is Zod-validated** before storage; retry on invalid output, then log.
- Prompts are versioned in `packages/prompts`; `promptVersion` is stored on each event.
- Thresholds, scoring, gap rules, weights and industry mappings live in **config/code, never in prompts**.
- Send diffs to the LLM, never full pages; cache by content hash.
- User corrections override LLM values.
- A failure in one source or competitor never blocks the others.
- User-facing text is plain business language.
