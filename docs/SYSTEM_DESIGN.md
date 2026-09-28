# System Design

How the Competitive Intelligence Platform is built: users and flows, architecture, pipeline, data model, comparison engine, LLM layer, jobs, deployment and non-functional design.

- Product spec: `docs/PROJECT_SPEC.md` (§ references below point there).
- Stack decisions: `docs/DECISIONS.md` (D-001 and D-002 accepted).
- Diagrams use Mermaid. Preview them in VS Code (Mermaid extension) or on GitHub.

---

## 1. Users

### 1.1 Personas

| Persona | Example | Main goal | Key screens |
|---|---|---|---|
| **Business owner** (non-technical) | Restaurant owner, D2C founder | "Where am I behind, and what should I look into?" | Dashboard, lagging report, weekly brief, alerts |
| **Founder / PM** (software) | B2B SaaS founder | Feature and pricing gaps, competitor launches | Offering matrix, head-to-head, timeline |
| **Marketing / strategy** | Marketing lead at an SMB | Positioning, campaigns, review themes | Leading report, review themes, patterns |

All personas use the same product. MVP has **one user per workspace** (no roles).

### 1.2 Use cases

```mermaid
flowchart LR
    U(("User<br/>(owner / founder / marketer)"))
    S(("Scheduler<br/>(system)"))

    subgraph Platform["Competitive Intelligence Platform"]
        UC1["Sign up & create workspace"]
        UC2["Set up business profile<br/>(auto-extracted, then reviewed)"]
        UC3["Add competitors"]
        UC4["Confirm suggested sources"]
        UC5["View dashboard"]
        UC6["View scorecard & rank"]
        UC7["View lagging / leading reports"]
        UC8["Head-to-head comparison"]
        UC9["View offering matrix & prices"]
        UC10["View competitor timeline"]
        UC11["Correct metric values / offerings"]
        UC12["Dismiss / mark lag item addressed"]
        UC13["Configure alerts & weights"]
        UC14["Read weekly brief"]
        UC15["Monitor sources"]
        UC16["Recompute comparison"]
        UC17["Send alerts & weekly brief"]
    end

    U --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8
    U --> UC9 & UC10 & UC11 & UC12 & UC13 & UC14
    S --> UC15 & UC16 & UC17
```

### 1.3 User journey

```mermaid
journey
    title Business owner: from sign-up to acting on insights
    section Setup (day 1, ~5 min)
      Sign up and name workspace: 4: User
      Enter website, industry, region: 4: User
      Review auto-extracted profile: 3: User, System
      Add 3-15 competitors: 4: User
      Confirm suggested sources: 3: User, System
    section First insight (day 1, after first run)
      See first scorecard and rank: 5: User, System
      Read top 5 lag items with evidence: 5: User
      Fill missing own data: 3: User
    section Ongoing (weekly)
      Get high-importance alert: 4: System
      Read weekly brief: 5: User, System
      Check head-to-head and timeline: 4: User
      Dismiss or mark lag items addressed: 4: User
      See gaps closed over time: 5: User, System
```

### 1.4 Onboarding flow

```mermaid
flowchart TD
    A[Sign up] --> B[Create workspace:<br/>name, industry, region]
    B --> C{Website provided?}
    C -- Yes --> D[Fetch own site + LLM extract profile]
    C -- No --> E[LLM extract profile from description]
    D --> F[User reviews & edits profile:<br/>offerings, prices, channels]
    E --> F
    F --> G[Add competitors: name, website?, location?]
    G --> H[Suggest sources per competitor<br/>from industry config]
    H --> I[User confirms / removes / adds sources]
    I --> J[Queue first fetch for all sources]
    J --> K[First pipeline run]
    K --> L[Dashboard with first scorecard<br/>+ missing data panel]
```

### 1.5 App navigation (sitemap)

```mermaid
flowchart TD
    Home["Dashboard<br/>(scorecard, rank, top 5 lag items,<br/>important changes, strengths, patterns, reviews)"]
    Home --> Compare["Compare"]
    Compare --> Scorecard["Scorecard (table + radar)"]
    Compare --> Lagging["Where you're lagging"]
    Compare --> Leading["Where you're leading"]
    Compare --> H2H["Head-to-head"]
    Compare --> PriceMap["Price position map"]
    Compare --> Progress["Progress over time"]
    Compare --> Missing["Missing data"]
    Home --> Competitors["Competitors"]
    Competitors --> CompDetail["Competitor detail"]
    CompDetail --> Timeline["Timeline"]
    CompDetail --> Sources["Sources & health"]
    Home --> Matrix["Offering matrix"]
    Home --> Insights["Insights"]
    Insights --> Patterns["Patterns"]
    Insights --> Reviews["Review themes"]
    Home --> Briefs["Weekly briefs"]
    Home --> Settings["Settings"]
    Settings --> Profile["Business profile & own metrics"]
    Settings --> Weights["Dimension weights & custom metrics"]
    Settings --> Alerts["Alert channels & thresholds"]
```

---

## 2. System context

```mermaid
flowchart LR
    User(("User"))

    subgraph CIP["Competitive Intelligence Platform"]
        Web["Web app"]
        Worker["Worker"]
    end

    subgraph Public["Public sources"]
        Sites["Competitor websites<br/>(pricing, menu, catalog, changelog)"]
        News["Google News RSS"]
        Reviews["Review sources<br/>(Google Places API / Play Store)"]
    end

    Claude["LLM API<br/>(OpenRouter, free models in MVP)"]
    Email["Resend (email)"]
    TG["Telegram Bot API"]

    User <-->|browser| Web
    Worker -->|fetch| Sites
    Worker -->|fetch| News
    Worker -->|API| Reviews
    Worker <-->|classify, extract, explain| Claude
    Web <-->|profile extraction| Claude
    Worker -->|alerts, briefs| Email
    Worker -->|alerts| TG
    Email --> User
    TG --> User
```

---

## 3. Architecture (containers)

```mermaid
flowchart TB
    subgraph Client
        Browser["Browser"]
    end

    subgraph WebApp["apps/web (Next.js)"]
        UI["Pages & components<br/>(shadcn/ui, Recharts)"]
        Actions["Server actions / route handlers"]
        AuthMW["Auth + workspace guard"]
    end

    subgraph WorkerApp["apps/worker (Node)"]
        Sched["Scheduler<br/>(repeatable jobs)"]
        Consumers["Queue consumers"]
        Adapters["Source adapters"]
        Pipeline["Pipeline steps"]
    end

    subgraph Packages["Shared packages"]
        Core["packages/core<br/>domain types (Zod), config,<br/>scoring, comparison, dedup, patterns"]
        DB["packages/db<br/>Drizzle schema, migrations, repos"]
        Prompts["packages/prompts<br/>versioned prompts + output schemas"]
    end

    PG[("PostgreSQL<br/>+ JSONB + pgvector")]
    Redis[("Redis<br/>BullMQ queues")]
    LLM["LLM API<br/>(OpenRouter)"]

    Browser --> UI --> Actions
    Actions --> AuthMW
    Actions --> DB
    Actions -->|enqueue jobs| Redis
    Sched --> Redis
    Redis --> Consumers
    Consumers --> Adapters
    Consumers --> Pipeline
    Pipeline --> DB
    Pipeline --> LLM
    Actions --> LLM
    DB --> PG
    WebApp -.uses.-> Core
    WorkerApp -.uses.-> Core
    WorkerApp -.uses.-> Prompts
    WebApp -.uses.-> Prompts
```

**Responsibilities**

| Component | Does | Does NOT |
|---|---|---|
| `apps/web` | UI, auth, CRUD (profile, competitors, sources, corrections, settings), reads computed results, enqueues on-demand jobs | Long-running fetch or LLM batch work |
| `apps/worker` | Scheduled fetching, pipeline steps, recompute, patterns, reviews, alerts, briefs | Serve HTTP to users |
| `packages/core` | Pure logic: Zod types, config, importance, comparison status, scoring, priority, dedup keys, pattern grouping | I/O (no DB, no network) → easy unit tests |
| `packages/db` | Schema, migrations, typed queries scoped by `workspaceId` | Business rules |
| `packages/prompts` | Prompt templates + version + output Zod schema | Thresholds or scoring (these live in config) |

### 3.1 Repository layout

```
ai-competitor-analysis/
├─ apps/
│  ├─ web/                 # Next.js app
│  │  └─ src/app/(auth)/, (app)/dashboard, compare/, competitors/, matrix/, briefs/, settings/
│  └─ worker/
│     └─ src/
│        ├─ queues/        # queue names, job payload schemas
│        ├─ jobs/          # one file per job type
│        ├─ adapters/      # website.ts, googleNews.ts, googleReviews.ts
│        └─ scheduler.ts
├─ packages/
│  ├─ core/
│  │  └─ src/
│  │     ├─ domain/        # Zod schemas + TS types (§4)
│  │     ├─ config/        # dimensions, industries/, importance, thresholds
│  │     ├─ comparison/    # status, scoring, lagItems, priority
│  │     ├─ events/        # dedupKey, importance
│  │     └─ patterns/
│  ├─ db/                  # drizzle schema, migrations, repositories
│  └─ prompts/             # extractEvent.v1.ts, mapOffering.v1.ts, explainLag.v1.ts, brief.v1.ts ...
├─ docs/
└─ CLAUDE.md
```

---

## 4. Data pipeline

### 4.1 End-to-end flow

```mermaid
flowchart TD
    S[Source due] --> F[fetch-source]
    F --> N[Normalize content]
    N --> H{Hash changed?}
    H -- No --> OK[Update lastFetchedAt, done]
    H -- Yes --> P{Website source &<br/>change seen 2 fetches?}
    P -- Not yet --> Pend[Store pending hash, done]
    P -- Yes / not website --> Snap[Store Snapshot]
    Snap --> Diff[Build diff old vs new]
    Diff --> Cache{Extraction cached<br/>for diff hash?}
    Cache -- Yes --> Ev
    Cache -- No --> X[LLM extract events<br/>+ Zod validate]
    X --> Ev[Candidate events]
    Ev --> Map[Map offerings to taxonomy]
    Map --> D{Duplicate?<br/>dedupKey / similarity}
    D -- Yes --> Merge[Merge sources into existing event]
    D -- No --> New[Insert event]
    New --> I[Score importance + reason]
    Merge --> I
    I --> Apply[Update offerings, prices,<br/>MetricValues]
    Apply --> R[Enqueue recompute-comparison<br/>debounced per workspace]
    I --> A{"importance at or above<br/>alert threshold?"}
    A -- Yes --> Al[Enqueue send-alert]
    R --> C[Comparison engine]
    C --> Pat[detect-patterns]
```

### 4.2 Sequence: competitor raises a price → user gets an alert

```mermaid
sequenceDiagram
    autonumber
    participant Sch as Scheduler
    participant Q as Redis (BullMQ)
    participant W as Worker
    participant Site as Competitor site
    participant DB as Postgres
    participant AI as LLM (OpenRouter)
    participant TG as Telegram / Email

    Sch->>Q: fetch-source {sourceId}
    Q->>W: job
    W->>Site: GET pricing page (rate-limited, robots.txt checked)
    Site-->>W: HTML
    W->>W: normalize + hash
    W->>DB: compare with lastHash, pendingHash
    W->>DB: insert Snapshot
    W->>Q: extract-events {sourceId, snapshotId}
    Q->>W: job
    W->>AI: diff + industry hints + offering taxonomy (main model)
    AI-->>W: JSON events
    W->>W: Zod validate (retry once on failure)
    W->>DB: map offerings, dedup, insert Event (pricing_change)
    W->>W: importance = high ("price change on main offering")
    W->>DB: update PriceEntry + MetricValue
    W->>Q: recompute-comparison {workspaceId} (debounced)
    W->>Q: send-alert {eventId}
    Q->>W: send-alert
    W->>DB: load event, self price, comparison status
    W->>TG: "Competitor A raised Standard ₹999→₹1,299 · you are 31% cheaper · source"
```

### 4.3 Pipeline step rules

| Step | Input → Output | Idempotency key | Failure handling |
|---|---|---|---|
| fetch-source | Source → Snapshot? | `sourceId:scheduledSlot` | Retry with exponential backoff; `errorCount++`; mark source `unhealthy` after N failures; never blocks other sources |
| extract-events | Snapshot + previous → Events | `snapshotId:promptVersion` | Retry invalid JSON once, then write to `extraction_failures` |
| process-event | Candidate event → stored Event | `dedupKey` | Transaction per event |
| recompute-comparison | Workspace → ComparisonResults, Scorecard, Lag/Strength items | `workspaceId` (debounce 5 min) | Safe to re-run; writes a new Scorecard version |
| detect-patterns | Workspace events (90 days) → Patterns | `workspaceId:date` | Re-run replaces open patterns |
| analyze-reviews | Review snapshots → ReviewThemes | `competitorId:periodStart` | Re-run replaces themes for the period |
| send-alert | Event → notification | `eventId:channel` | Retry; record delivery in `alert_deliveries` |
| generate-brief | Workspace week → Brief | `workspaceId:periodStart` | Generate once, deliver per channel with retry |

---

## 5. Data model

### 5.1 Entity relationships

```mermaid
erDiagram
    USER ||--o{ WORKSPACE : owns
    WORKSPACE ||--|| BUSINESS_PROFILE : has
    WORKSPACE ||--o{ COMPETITOR : tracks
    WORKSPACE ||--o{ OFFERING : "taxonomy"
    WORKSPACE ||--o{ METRIC_DEFINITION : "custom metrics"
    WORKSPACE ||--o{ METRIC_VALUE : stores
    WORKSPACE ||--o{ COMPARISON_RESULT : computes
    WORKSPACE ||--o{ SCORECARD : "history"
    WORKSPACE ||--o{ LAG_ITEM : has
    WORKSPACE ||--o{ STRENGTH_ITEM : has
    WORKSPACE ||--o{ PATTERN : detects
    WORKSPACE ||--o{ BRIEF : receives
    COMPETITOR ||--o{ SOURCE : "monitored via"
    BUSINESS_PROFILE ||--o{ SOURCE : "own sources"
    SOURCE ||--o{ SNAPSHOT : captures
    COMPETITOR ||--o{ EVENT : produces
    EVENT }o--o{ SOURCE : "event_sources"
    EVENT }o--o{ SNAPSHOT : "evidence"
    EVENT }o--o{ OFFERING : affects
    OFFERING ||--o{ PRICE_ENTRY : priced
    METRIC_DEFINITION ||--o{ METRIC_VALUE : measured
    METRIC_DEFINITION ||--o{ COMPARISON_RESULT : compared
    COMPETITOR ||--o{ REVIEW_THEME : has
    LAG_ITEM }o--o{ EVENT : "evidence"
    LAG_ITEM }o--o{ REVIEW_THEME : "customer signal"
    PATTERN }o--o{ EVENT : groups

    WORKSPACE {
        uuid id PK
        uuid owner_id FK
        text name
        text industry
        text industry_category
        text region
        jsonb alert_settings
        jsonb dimension_weights
    }
    COMPETITOR {
        uuid id PK
        uuid workspace_id FK
        text name
        text website
        text_array locations
    }
    SOURCE {
        uuid id PK
        uuid workspace_id FK
        text subject_type "self or competitor"
        uuid subject_id
        text type
        text url
        jsonb config
        text last_hash
        text pending_hash
        timestamptz last_fetched_at
        text status
        int error_count
    }
    SNAPSHOT {
        uuid id PK
        uuid source_id FK
        text hash
        text content
        timestamptz fetched_at
    }
    EVENT {
        uuid id PK
        uuid workspace_id FK
        uuid competitor_id FK
        text type
        text title
        text summary
        jsonb structured
        text importance
        text importance_reason
        text dedup_key
        vector embedding
        text prompt_version
        timestamptz occurred_at
        timestamptz detected_at
    }
    OFFERING {
        uuid id PK
        uuid workspace_id FK
        text name
        text category
        text_array aliases
        vector embedding
    }
    METRIC_VALUE {
        uuid id PK
        uuid workspace_id FK
        text metric_id FK
        text subject_type
        uuid subject_id
        jsonb value
        text origin
        text confidence
        jsonb evidence
        timestamptz observed_at
    }
    LAG_ITEM {
        uuid id PK
        uuid workspace_id FK
        text dimension_key
        text title
        text trend
        text impact
        numeric priority_score
        text investigation
        text status
    }
```

### 5.2 Storage decisions

| Topic | Decision |
|---|---|
| Multi-tenancy | Every table carries `workspace_id`; all queries go through repositories that require it. |
| Flexible payloads | `Event.structured`, `MetricValue.value`, `evidence`, settings are JSONB validated by Zod on write. |
| Embeddings | `pgvector` columns on `event` and `offering` (dedup + offering matching). |
| Snapshots | MVP: normalized text in Postgres (compressed by TOAST). Later: object storage (S3/R2) with key in DB. |
| History | `scorecard` and `metric_value` are append-only; "current" = latest by `observed_at` / `computed_at`. |
| User overrides | `origin = user_entered` always wins over `auto_detected` for the same metric and subject. |
| Metric definitions | Built-in ones live in code config (`packages/core/config/industries/*`); only custom metrics are stored in DB. |

---

## 6. Offering mapping (taxonomy)

The hardest correctness problem (§9): a wrong mapping creates wrong gaps with high confidence.

```mermaid
flowchart TD
    M["Mention from event:<br/>'express dispatch'"] --> N[Normalize text:<br/>lowercase, trim, singularize]
    N --> A{Exact name or<br/>alias match?}
    A -- Yes --> Use[Use existing Offering]
    A -- No --> V[pgvector top-5 similar offerings]
    V --> T{"Top similarity above<br/>high threshold?"}
    T -- Yes --> Use
    T -- No --> L{"Any candidate above<br/>low threshold?"}
    L -- Yes --> LLM["LLM: same thing as candidate X?<br/>(structured yes/no + id)"]
    LLM -- Match --> AddAlias[Add mention as alias] --> Use
    LLM -- No match --> Create[Create new Offering]
    L -- No --> Create
    User[User correction in matrix] --> Merge[Merge offerings / add alias]
```

Thresholds live in `packages/core/config/thresholds.ts`.

---

## 7. Comparison engine (core, §2A)

Runs in `recompute-comparison`, as pure functions in `packages/core/comparison`. The LLM is used only at the end to write text.

```mermaid
flowchart LR
    MV[(Latest MetricValues<br/>self + competitors)] --> CR[1. Status per metric<br/>ComparisonResult]
    MD[Metric definitions<br/>industry config + custom] --> CR
    CR --> SC[2. Scores per dimension<br/>+ overall + rank]
    W[Dimension weights] --> SC
    CR --> LI[3. Lag & strength items]
    OFF[(Offering matrix)] --> LI
    SC --> PR[4. Priority + trend]
    LI --> PR
    HIST[(Previous scorecard<br/>& lag items)] --> PR
    RT[(Review themes)] --> PR
    PR --> TXT[5. LLM writes explanation<br/>+ 'look into' line]
    TXT --> OUT[(Scorecard, LagItems,<br/>StrengthItems)]
```

### 7.1 Metric status (default rules, all values in config)

For one metric, compare self with each competitor that has a **known** value:

- **Per competitor:** `ahead` / `behind` / `equal`. Booleans compare directly. Numbers use `higherIsBetter` with a tolerance (default ±5%) for `equal`.
- `known` = number of competitors with a value.

| Status | Rule |
|---|---|
| `unknown` | Self value unknown **or** `known < minKnownCompetitors` (default 2) |
| `unique` | Boolean metric, self = true, all known competitors = false |
| `lagging` | `ahead / known > 0.5` |
| `leading` | `behind / known > 0.5` |
| `at_par` | Otherwise |

### 7.2 Scores

1. **Metric score (0–100) per subject:** boolean → 100 or 0; numeric → min-max normalized across subjects in the direction of `higherIsBetter` (all equal → 100); unknown → excluded.
2. **Dimension score:** mean of known metric scores. `null` if coverage (known ÷ defined metrics) < `minCoverage` (default 0.3). Coverage is always shown next to the score.
3. **Overall score:** weighted mean of non-null dimension scores, with weights re-normalized over available dimensions.
4. **Rank:** order subjects by overall score.

### 7.3 Lag items and priority

- Sources: every `lagging` metric, plus offering gaps (offerings the user lacks that ≥ `gapMinCompetitors` (default 2) competitors have).
- `trend`: compared with the previous run. `new` = not present before; `widening` = more competitors ahead or a larger value gap; `narrowing` = the opposite; `stable` otherwise.
- Priority (weights in config):

```
priority = dimensionWeight
         × shareOfCompetitorsAhead
         × impact            (event-type weight × review demand × recency decay)
         × trendMultiplier   (widening 1.3 > new 1.2 > stable 1.0 > narrowing 0.8)
```

- `dismissed` or `addressed` items stay hidden until **new evidence** (a new event or metric value) touches the same metric or offering.

---

## 8. Importance scoring & pattern detection

### 8.1 Importance (deterministic)

```
score = baseWeight[eventType]                      // config, adjustable per industry
      + (touches offering user LACKS  ? +2 : 0)
      + (touches offering user HAS    ? +1 : 0)
      + (part of active pattern       ? +1 : 0)
      + (in user's region             ? +1 : 0)    // local businesses
level = score >= high ? 'high' : score >= medium ? 'medium' : 'low'
```

`importanceReason` is assembled from the rules that fired (e.g. "Pricing change on an offering you also sell").

### 8.2 Patterns

1. Take events from the last `windowDays` (default 90).
2. Group by `offering.category`, `event.type`, and `(type, offering)`.
3. Create a Pattern if distinct competitors ≥ 3 **or** ≥ 50% of tracked competitors.
4. The LLM writes only `summary` ("3 of 6 competitors raised prices in 90 days").

---

## 9. LLM layer

**Provider (D-002):** MVP uses **free models on OpenRouter** (OpenAI-compatible API). The code is provider-agnostic: provider and models come from env, so moving to a paid model later is a config change, not a code change.

```
LLM_PROVIDER=openrouter            # later: openrouter (paid model) or anthropic
LLM_MODEL_MAIN=nvidia/nemotron-3-ultra-550b-a55b:free
LLM_MODEL_BACKUP=google/gemma-4-26b-a4b-it:free # used on rate limit / repeated schema failure
LLM_MODEL_FAST=                    # optional later: split high-volume tasks to a cheaper/faster model
EMBEDDING_MODEL=<free embedding model id>   # for pgvector dedup + offering match
```

| Task | Model role | Input | Output schema | Prompt |
|---|---|---|---|---|
| Profile extraction | main | Own site text or description | `BusinessProfileDraft` | `extractProfile.v1` |
| Event extraction | main | **Diff only** + industry hints + offering names | `ExtractedEvent[]` | `extractEvents.v1` |
| Offering match | main | Mention + top candidates | `{ matchId \| null }` | `mapOffering.v1` |
| Metric extraction | main | Snapshot excerpt + metric definitions | `MetricValueDraft[]` | `extractMetrics.v1` |
| Review themes | main | Batched reviews | `ReviewTheme[]` | `reviewThemes.v1` |
| Lag/strength explanation | main | Computed item + evidence | `{ explanation, investigation }` | `explainItem.v1` |
| Pattern summary | main | Grouped events | `{ summary }` | `patternSummary.v1` |
| Weekly brief | main | Stored week data only | `BriefSections` | `weeklyBrief.v1` |

**Rules**

```mermaid
flowchart LR
    In[Input] --> Cache{"Cache hit?<br/>key = promptVersion + model + inputHash"}
    Cache -- Yes --> Out[Validated output]
    Cache -- No --> Call["LLM call (main model,<br/>backup on rate limit)<br/>structured output"]
    Call --> Val{Zod valid?}
    Val -- Yes --> Store[Store in cache] --> Out
    Val -- No --> Retry{Retried?}
    Retry -- No --> Call
    Retry -- Yes --> Fail[Log to llm_failures<br/>skip item]
```

- A single `llm` client wrapper in `packages/prompts` handles model choice, caching, validation, retries, token logging and the cost budget per workspace.
- Prompts never contain thresholds or scoring rules; they receive computed facts.
- Output that makes claims must reference provided evidence ids; the wrapper drops text with unknown ids.
- `promptVersion` **and model id** are stored on every output row, so results can be compared after a model switch.
- Free models: never send private user data that isn't needed; public competitor content is fine. Check each model's data-retention policy.

---

## 10. Jobs & scheduling

| Queue | Trigger | Default schedule | Concurrency |
|---|---|---|---|
| `fetch-source` | Scheduler, "refresh now" | website/pricing/menu: 24h · news: 6h · reviews: 24h | Per-domain limiter (1 request / 10s) |
| `extract-events` | New snapshot | n/a | Limited by LLM rate budget |
| `process-event` | Extracted events | n/a | Per workspace serial |
| `recompute-comparison` | Event, metric change, user correction | Daily + debounced 5 min | 1 per workspace |
| `analyze-reviews` | New review snapshots | Daily | Low |
| `detect-patterns` | After recompute | Daily | 1 per workspace |
| `send-alert` | High-importance event | n/a | High |
| `generate-brief` | Scheduler | Weekly (workspace timezone, Monday 8am) | Low |

Failed jobs go to a dead-letter list visible in an internal admin page.

---

## 11. Source adapters

```ts
interface SourceAdapter {
  type: SourceType;
  fetch(source: Source, ctx: FetchContext): Promise<RawContent>; // respects rate limit + robots.txt
  normalize(raw: RawContent): NormalizedContent; // strip nav, footer, banners, timestamps
  diff?(prev: NormalizedContent, next: NormalizedContent): Diff; // default: text/line diff
  items?(content: NormalizedContent): Item[]; // feeds/reviews: new items instead of diff
}
```

| Adapter (MVP) | Method | Change detection |
|---|---|---|
| `website` (incl. pricing, menu) | fetch + Readability/cheerio; Playwright if `config.jsRendered` | Normalized hash, confirmed across 2 fetches |
| `google_news` | RSS feed for competitor-name query | New item ids |
| `google_business` / `play_store` | Official API where required | New review ids + rating/count metrics |

Adding a source type = one new adapter + a config entry. No pipeline changes.

---

## 12. Deployment

```mermaid
flowchart TB
    subgraph Vercel
        WebD["apps/web (Next.js)"]
    end
    subgraph WorkerHost["Railway / Fly.io"]
        WorkerD["apps/worker (Node, long-running)"]
        PW["Playwright (in worker image)"]
        RedisD[("Redis")]
    end
    subgraph DBHost["Supabase (Postgres + Auth)"]
        PGD[("Postgres + pgvector")]
    end
    Ext["OpenRouter · Resend · Telegram · Google APIs"]

    WebD --> PGD
    WebD --> RedisD
    WorkerD --> PGD
    WorkerD --> RedisD
    WorkerD --- PW
    WorkerD --> Ext
    WebD --> Ext
```

Environments: `local` (Supabase + Upstash free tiers, no Docker needed), `staging`, `production`. Redis: Upstash. Migrations run in CI before deploy.

---

## 13. Non-functional design

| Area | Approach |
|---|---|
| **Reliability** | Idempotent jobs, retries with backoff, dead-letter queue, per-source isolation, source health status in UI |
| **Precision (noise)** | Normalization before hashing, 2-fetch confirmation for websites, dedup, importance thresholds, real-time alerts only for `high` |
| **Trust** | Every insight stores evidence (source, snapshot, excerpt); UI shows origin (auto / user) and confidence; unknowns shown as unknown |
| **Security** | Auth on all routes; owner/workspace-scoped repositories; RLS enabled with no policies so Supabase's public Data API can't read app tables (the app connects as the DB owner); secrets only in env; no scraping behind logins; SSRF guard on user-provided URLs (block private IPs) |
| **Compliance** | robots.txt respected, per-domain rate limits, official APIs where terms require, identifiable user agent |
| **Cost** | Free OpenRouter models in MVP (D-002), diffs only to the LLM, content-hash cache, batching, per-workspace token budget and logging |
| **Observability** | Structured logs (pino) with `workspaceId`/`jobId`; job metrics (success, latency, retries); LLM token and cost per task; error tracking (Sentry) |
| **Scale (MVP target)** | ~100 workspaces × 10 competitors × 3–5 sources ≈ 5k fetches/day: one worker instance is enough; scale by adding worker replicas |
| **Testing** | Unit tests for `packages/core` (status, scoring, priority, importance, patterns, dedup); fixture-based adapter tests (HTML before/after); prompt eval sets per industry with expected events |
