# Competitive Intelligence Platform: Project Context

> This file gives an AI coding assistant full context on what this project is, what problem it solves, and what to build. This is a **new project built from scratch**. There is no existing code. Read this before making architectural decisions.

---

## 1. What this project is

An **AI-powered competitive intelligence platform for any type of business**: software companies, e-commerce and D2C brands, restaurants and retail, service businesses, manufacturers, real estate, healthcare providers, and so on.

A user describes their business and lists their competitors. The platform then does four things:

- Continuously monitors those competitors across public sources.
- Detects meaningful changes and turns each one into a structured event.
- Compares events against the user's own business.
- Surfaces gaps, risks, customer pain points and market patterns, with source evidence for every claim.

It is **not** a news aggregator or a page-change monitor. The value is in the interpretation layer that turns raw changes into answers.

---

## 2. The problem

Every business needs to know what its competitors are doing: what they launched, what they changed, what they charge, what customers say about them, and where the market is heading. The information is mostly public, but using it is hard for three reasons.

1. **Fragmentation.** Signals are spread across many places: websites, pricing and menu pages, product listings, app stores, Google reviews, marketplaces, social media, news, Reddit, job posts. Which sources matter depends on the type of business. Nobody checks all of them continuously, so changes get missed.
2. **Noise without meaning.** Existing tools (Google Alerts, page-change monitors) report *that* something changed, not *what it means*. A price increase and a website redesign look the same.
3. **No business context and no memory.** Nothing relates a competitor's change to the user's own business, and nothing links related events over time. As a result, gaps, risks and industry-wide shifts are noticed late, often through lost customers or sales.

Enterprise competitive intelligence tools exist, but they are expensive, built for large sales teams, and depend on analysts. Most businesses end up with manual, occasional research.

### Who uses it

Business owners, founders, product managers, marketing teams and strategy teams at small and mid-sized businesses in any industry, who track roughly 3–15 competitors and have no dedicated analyst.

### Examples across business types

| Business type | Example signal | Example insight |
|---|---|---|
| Software | Competitor launches WhatsApp support | "You offer email and chat only. 3 of 5 competitors now support WhatsApp." |
| D2C / e-commerce | Competitor drops price on a bestseller, adds a new product line | "Competitor A undercuts your equivalent product by 18%." |
| Restaurant | Competitor adds delivery and a lunch combo, reviews praise speed | "2 nearby competitors launched lunch combos this month." |
| Service business | Competitor adds same-day booking and a subscription plan | "Subscription pricing is appearing across 3 competitors." |
| Manufacturer | Competitor announces a new certification and a distributor partnership | "Competitor B entered your region through a distributor." |
| Real estate | Competitor launches a new project with a payment scheme | "Flexible payment plans are now offered by 4 of 6 developers." |

### What the system must answer for the user

| # | Question | Example output |
|---|----------|----------------|
| 1 | What changed? | "Competitor A raised its standard plan from ₹999 to ₹1,299" |
| 2 | Does it matter? | Importance: high (pricing change on the main offering) |
| 3 | How does it compare to my business? | "Your equivalent is ₹899, now 31% cheaper" |
| 4 | Is it a one-off or a pattern? | "3 of 6 competitors raised prices in the last 90 days" |
| 5 | What should I look into? | "Evaluate pricing headroom on your standard offering" |

### Design principles

- **Industry-agnostic core, industry-aware configuration.** The pipeline, data model and logic are the same for every business. Industry only changes which sources are suggested, which event types matter most, and which prompt hints are used.
- **Precision over recall.** A noisy feed makes the product useless. When unsure, log the event but don't alert.
- **Every insight links to evidence.** No claim is shown without source URLs and a snapshot or excerpt.
- **Suggest investigations, not decisions.** Say "evaluate X", never "do X".
- **Structured data first, LLM second.** The LLM classifies and extracts into typed schemas. Scoring, gap detection and pattern detection are deterministic code wherever possible.

---

## 2A. The central experience: "Where am I lagging?"

This is the heart of the product. Everything else (monitoring, events, reviews, patterns) feeds it.

The user asks: **"Compare my business with my competitors. Where am I behind, where am I ahead, and what should I look into first?"**

The platform answers with a **full, multi-dimensional comparison**, not just a feature list. Every finding is backed by evidence.

### Comparison dimensions

Every business is compared on the same universal dimensions. Industry changes which metrics sit inside each dimension and how much each dimension weighs.

| # | Dimension | What is compared | Example metrics |
|---|-----------|------------------|-----------------|
| 1 | **Offerings** | What each business sells or provides | Products, services, features, menu items, plans, product range breadth, new launches |
| 2 | **Pricing & value** | What customers pay and get | Price per equivalent offering, entry price, discounts, free trials, bundles, payment options (EMI, subscriptions) |
| 3 | **Customer experience** | How easy it is to buy and use | Ordering or booking options, delivery speed, support channels (WhatsApp, chat, phone), onboarding steps, return and refund policy |
| 4 | **Reputation & reviews** | What customers say | Average rating, review count, review growth, top complaints, top praises, response rate to reviews |
| 5 | **Digital presence** | How visible and modern they are online | Website quality and speed, mobile app, app store rating, SEO visibility, Google Business completeness |
| 6 | **Marketing & brand** | How they attract customers | Active campaigns, promotions frequency, social media activity and engagement, content output, messaging and positioning |
| 7 | **Sales channels & reach** | Where customers can buy | Own website, marketplaces, retail, distributors, delivery apps, cities and regions served, number of locations |
| 8 | **Innovation speed** | How fast they change | New offerings per quarter, update frequency, app release frequency, adoption of new tech (AI, automation) |
| 9 | **Growth signals** | Whether they are expanding | Hiring volume and roles, funding, new locations, partnerships, expansion announcements |
| 10 | **Trust & credentials** | Why customers trust them | Certifications, awards, notable clients, case studies, guarantees, years in business |

Rules:
- The dimension list is fixed. The **metrics inside each dimension** come from config per industry category (for example, "delivery time" for a restaurant, "API availability" for software, "possession timeline" for real estate).
- The user can hide dimensions, add custom metrics, and change dimension weights.
- Metrics that can't be measured from public data are shown as **unknown**, never guessed.

### Status for every metric

For each metric, the user's business is compared against each competitor and against the competitor set as a whole:

- **Lagging:** most competitors are ahead of the user on this metric.
- **At par:** roughly the same as most competitors.
- **Leading:** the user is ahead of most competitors.
- **Unique:** only the user has it (a differentiator to protect).
- **Unknown:** not enough data. Show what data is missing and how to get it.

Status is computed by deterministic code from stored metric values, never decided by the LLM alone.

### Outputs

**1. Competitive scorecard.**
A score from 0 to 100 per dimension for the user and each competitor, plus an overall weighted score and rank. Shown as a table and a radar chart. Each score expands to show the metrics and evidence behind it.

**2. "Where you're lagging" report.**
A prioritized list of lag items. Each item contains:
- **What:** "No WhatsApp ordering"
- **Dimension:** Customer experience
- **Who is ahead:** "4 of 6 competitors", with names
- **Evidence:** links and snapshots from each competitor
- **Customer signal:** related review themes, e.g. "Customers of 2 competitors praise quick WhatsApp ordering"
- **Trend:** new gap, widening, or stable (based on history)
- **Impact:** high / medium / low, with a one-line reason
- **Effort hint (optional):** rough effort category, clearly marked as an estimate
- **What to look into:** "Evaluate WhatsApp Business ordering for repeat customers"

**3. "Where you're leading" report.**
Strengths and unique advantages, with evidence, so the user knows what to protect and promote. Includes competitor weaknesses from reviews that match the user's strengths.

**4. Head-to-head view.**
The user vs. one chosen competitor across all dimensions and metrics, side by side, with differences highlighted.

**5. Price position map.**
Where the user sits on price vs. competitors for each equivalent offering (cheapest, middle, premium), with gaps in percentage.

**6. Change over time.**
How scores and lag items move week to week: "You closed 2 gaps this month; 1 new gap opened in Pricing."

### Prioritization of lag items

Lag items are ranked by deterministic scoring:

```
priority = dimensionWeight
         × share of competitors ahead
         × impact (based on event type, customer review demand, recency)
         × trend multiplier (widening > new > stable)
```

Weights and formula parts live in config. The LLM only writes the explanations.

### Where the user's own data comes from

A comparison is only as good as the user's own profile:
- Auto-extracted from the user's website, listings and reviews, the same way competitors are.
- The user confirms and fills in what's missing (e.g. internal delivery time, support channels).
- The user's own sources are monitored too, so the profile stays current.
- Every metric shows whether the user's value is **auto-detected** or **user-entered**.

### Example: restaurant

> **Overall rank: 4 of 6**
>
> **Lagging**
> 1. **Online ordering channels** (Sales channels): 5 of 6 competitors are on 2+ delivery apps, you are on 1. *Look into:* adding a second delivery platform.
> 2. **Review volume** (Reputation): your 180 reviews vs. competitor median of 640; your rating 4.4 vs. median 4.2. *Look into:* asking happy customers for reviews. Quality is good, visibility is low.
> 3. **Lunch combos** (Offerings): 3 competitors launched combos in the last 60 days. *Look into:* a weekday lunch offer.
>
> **Leading**
> - **Price:** you are 12% cheaper than median on comparable dishes.
> - **Unique:** only one with an in-house bakery section.

### Example: software company

> **Lagging**
> 1. **AI assistance** (Innovation): 4 of 5 competitors launched AI features in 90 days.
> 2. **Onboarding** (Customer experience): your signup has 6 steps vs. competitor median of 3.
>
> **Leading**
> - **Integrations:** 40 vs. competitor median of 15.

---

## 3. Target pipeline

```
Sources → Fetch → Normalize content → Hash diff → Dedup
       → LLM classify/extract → Event → Importance score
       → Competitor timeline → Update offering matrix + metric values
       → Comparison engine (scorecard, lagging/leading, gaps)
       → Pattern detection (cross-competitor, time window)
       → Alerts (high importance, real-time) + Weekly brief + Dashboard
```

Each stage must be an independent, idempotent step. A failure in one source or one competitor must not block the others.

---

## 4. Core domain model

The central abstraction is the **Offering**: anything a business provides that can be compared. It covers software features, physical products, menu items, services, plans, delivery options, certifications, payment options, locations, and similar. This single concept is what lets the platform work for every industry.

```ts
Workspace {
  id, name
  industry: string            // free text plus a category, e.g. "restaurant", "d2c_skincare", "b2b_saas"
  industryCategory: 'software' | 'ecommerce' | 'food_hospitality' | 'retail'
                  | 'services' | 'manufacturing' | 'real_estate'
                  | 'healthcare' | 'education' | 'other'
  region?: string             // matters for local businesses
  businessProfile: BusinessProfile
  competitorIds: string[]
  alertSettings: { channels, minImportance, digestMode }
}

// The user's own business
BusinessProfile {
  description: string
  offerings: OfferingRef[]
  pricing: PriceEntry[]
  targetCustomers: string
  locations?: string[]
  sourceUrls: string[]        // own website, listings, used to auto-extract the profile
}

Competitor {
  id, workspaceId, name
  website?: string
  locations?: string[]
  sources: Source[]
  offerings: OfferingRef[]    // maintained from events
  pricing: PriceEntry[]
}

Source {
  id, competitorId
  type: 'website' | 'pricing_page' | 'product_catalog' | 'menu'
      | 'changelog' | 'blog' | 'play_store' | 'app_store'
      | 'google_business' | 'marketplace_listing' | 'google_news'
      | 'reddit' | 'rss' | 'jobs' | 'social'
  url, config?: Record<string, unknown>
  lastHash, lastFetchedAt, status, errorCount
}

Snapshot {                     // raw evidence, required for trust
  id, sourceId, hash, content, fetchedAt
}

Event {
  id, competitorId, sourceIds[], snapshotIds[]
  type: 'new_offering' | 'offering_removed' | 'offering_updated'
      | 'pricing_change' | 'promotion' | 'partnership' | 'expansion'
      | 'funding' | 'hiring' | 'app_release' | 'review_trend'
      | 'marketing_campaign' | 'leadership_change' | 'other'
  title, summary
  structured: Record<string, unknown>  // type-specific, e.g. { item, oldPrice, newPrice, currency }
  offeringsAffected: OfferingRef[]
  importance: 'low' | 'medium' | 'high'
  importanceReason: string
  occurredAt, detectedAt
  dedupKey
  promptVersion
}

// Canonical offering taxonomy per workspace, which makes comparison possible
Offering {
  id, workspaceId
  name          // "Home delivery", "WhatsApp support", "Vegan range"
  category      // "Fulfilment", "Customer support", "Product line"
  aliases: string[]
}

PriceEntry {
  offeringId?, label, amount, currency, unit?, observedAt, sourceId
}

// ---- Comparison engine ----

Dimension {                    // fixed list of 10, see section 2A
  key: 'offerings' | 'pricing' | 'customer_experience' | 'reputation'
     | 'digital_presence' | 'marketing' | 'channels' | 'innovation'
     | 'growth' | 'trust'
  name, defaultWeight
}

MetricDefinition {             // from industry config, plus user custom metrics
  id, dimensionKey, name
  industryCategories: string[]
  valueType: 'boolean' | 'number' | 'rating' | 'currency' | 'count' | 'duration' | 'text'
  higherIsBetter?: boolean     // price: false, rating: true
  unit?: string
  sourceTypes: string[]        // where the value can be found
}

MetricValue {                  // one value for one business (user or competitor)
  id, workspaceId, metricId
  subject: { type: 'self' | 'competitor', id }
  value: unknown
  origin: 'auto_detected' | 'user_entered'
  confidence: 'high' | 'medium' | 'low'
  evidence: { sourceId, snapshotId, excerpt }[]
  observedAt
}

ComparisonResult {             // per metric, computed by code
  workspaceId, metricId
  status: 'lagging' | 'at_par' | 'leading' | 'unique' | 'unknown'
  competitorsAhead: string[], competitorsBehind: string[]
  selfValue, competitorMedian
  computedAt
}

Scorecard {                    // snapshot per run, kept for history
  id, workspaceId, computedAt
  scores: { subject, dimensionScores: Record<DimensionKey, number | null>, overall, rank }[]
  weights: Record<DimensionKey, number>
}

LagItem {
  id, workspaceId, dimensionKey, metricId?, offeringId?
  title
  competitorsAhead: string[]
  evidenceEventIds: string[], evidence: { sourceId, snapshotId, excerpt }[]
  relatedReviewThemeIds: string[]
  trend: 'new' | 'widening' | 'stable' | 'narrowing'
  impact: 'high' | 'medium' | 'low', impactReason
  priorityScore: number
  investigation: string          // "Evaluate ..."
  status: 'open' | 'dismissed' | 'addressed'
  firstSeenAt, updatedAt
}

StrengthItem {
  id, workspaceId, dimensionKey, metricId?, offeringId?
  title, type: 'leading' | 'unique'
  competitorsBehind: string[], evidence, matchedCompetitorWeaknesses: string[]
}

Gap {
  id, workspaceId, offeringId
  competitorsWithIt: string[]
  evidenceEventIds: string[]
  firstSeenAt, status: 'open' | 'dismissed' | 'addressed'
}

Pattern {
  id, workspaceId, theme, eventIds: string[]
  competitorCount, windowDays, summary, detectedAt
}

ReviewTheme {
  id, competitorId, theme, sentiment: 'positive' | 'negative'
  mentionCount, exampleExcerpts: string[], periodStart, periodEnd
}

Brief {
  id, workspaceId, periodStart, periodEnd
  sections: { topDevelopments, newGaps, patterns, reviewThemes, risks }
  deliveredAt, channels
}
```

---

## 5. Features

Each feature lists what it does and what "done" means.

### F1. Onboarding and business profile
- The user enters their business name, website (optional), a description, industry and region.
- The system auto-extracts an initial business profile (offerings, pricing, target customers) from their website or description through the LLM. The user reviews and edits it.
- The user adds competitors by name, and optionally website and location.
- **Done when:** a user from any industry can finish setup in a few minutes, ending with a reviewed profile and a competitor list.

### F2. Industry-aware source discovery
- For each competitor, suggest relevant sources based on industry category. Examples:
  - **Software:** website, pricing page, changelog, app stores, news, Reddit, jobs.
  - **E-commerce / D2C:** website catalog, marketplace listings, news, social, reviews.
  - **Food / retail / local services:** website, menu or service page, Google Business listing and reviews, social, news.
  - **Manufacturing / real estate:** website, news, press releases, jobs, project or product pages.
- The user confirms, removes or adds sources.
- Industry-to-source mappings live in config, not hardcoded logic.
- **Done when:** suggested sources are relevant to the business type and editable.

### F3. Source monitoring
- A scheduled fetcher runs per source type, with one adapter per type behind a common interface.
- Content is normalized before hashing: extract main content and strip navigation, footers, cookie banners, timestamps and rotating elements.
- A `Snapshot` is stored for every detected change.
- Source health is tracked (errors, last success), with backoff on failures. Rate-limit per domain and respect robots.txt. Prefer official APIs and feeds.
- **Done when:** a cosmetic change produces no diff, a real content change does, and adding a new source type means writing one adapter.

### F4. Event classification and extraction
- An LLM call turns a diff (old vs. new, or a new item) into a typed `Event`, validated against a strict schema. Invalid output is retried, then logged.
- Type-specific structured fields are extracted (price, item name, partner, location, role).
- Mentioned offerings are mapped to the canonical `Offering` taxonomy: match an existing name or alias first, create new only if no match.
- The prompt includes industry context to improve classification.
- **Done when:** every event is a validated structured object linked to its sources.

### F5. Deduplication
- The same development reported by several sources (website, news, social) becomes **one** event with multiple sources.
- Use a `dedupKey` (competitor + type + normalized subject + time window) plus similarity matching as a fallback.
- **Done when:** one real-world development shows up once, with all its sources listed.

### F6. Importance scoring
- Rule-based base score per event type. Pricing changes and new offerings rank high; minor updates rank low. Weights can be adjusted per industry category.
- Adjustments: whether the event touches an offering the user has or lacks, whether it's part of an active pattern, and whether it's in the user's region.
- A human-readable `importanceReason` is stored.
- **Done when:** every event has an importance level plus a reason, and only `high` alerts in real time by default.

### F7. Competitor timeline
- A reverse-chronological feed of events per competitor, filterable by type and importance.
- Each item expands to its summary, structured fields and source evidence.
- **Done when:** a user can open any competitor and see what changed, when, and the proof.

### F8. Offering comparison matrix
- A grid with offerings as rows and the user's business plus each competitor as columns.
- Cells are yes / no / unknown, and each "yes" links to its evidence.
- A price comparison view shows equivalent offerings side by side, with currency and unit.
- It updates automatically from events. Manual user corrections take precedence over the LLM.
- **Done when:** the matrix reflects current data and every cell is traceable.

### F9. Comparison engine: "Where am I lagging?" (core feature, see section 2A)
- Collect `MetricValue`s for the user and every competitor across all 10 dimensions, using industry metric config.
- The user fills in or corrects their own values. Every value stores origin, confidence and evidence.
- Compute `ComparisonResult` per metric with code: lagging, at par, leading, unique, or unknown.
- Compute a `Scorecard` per run: 0–100 score per dimension, weighted overall score and rank. Keep history.
- Generate `LagItem`s (including offering gaps: an offering the user lacks that at least N competitors have, default 2) and `StrengthItem`s.
- Rank lag items with the configurable priority formula. The LLM writes only the explanation and the "look into" line.
- Lag items can be dismissed or marked addressed. They come back only when new evidence arrives.
- Recompute when relevant events or metric values change, and on a daily schedule.
- **Done when:** for a real business, the system produces a scorecard, a ranked lagging list and a leading list across all dimensions, where every item has evidence and unknowns are shown as unknown.

### F9b. Comparison views
- **Scorecard:** table plus radar chart, user vs. all competitors, expandable to metrics and evidence.
- **Lagging report:** prioritized list with what, who is ahead, evidence, customer signal, trend, impact, and what to look into.
- **Leading report:** strengths, unique advantages, and matching competitor weaknesses.
- **Head-to-head:** user vs. one competitor across every metric, differences highlighted.
- **Price position map:** cheapest / middle / premium per equivalent offering, with percentage differences.
- **Progress over time:** score changes, gaps closed, gaps opened.
- **Missing data panel:** which metrics are unknown and how the user can fill them.
- **Done when:** a non-technical owner can understand where they're behind and why, in under 2 minutes.

### F10. Pattern detection
- Groups events across competitors within a time window (default 90 days) by offering category, event type or theme.
- Creates a `Pattern` when at least 3 competitors, or at least 50% of tracked competitors, show related events.
- Grouping and thresholds are code. The LLM only writes the summary.
- **Done when:** insights like "X of Y competitors did Z in N days" appear with linked events.

### F11. Customer review intelligence
- Collect reviews from sources relevant to the industry: app stores, Google Business, marketplaces, Reddit.
- Cluster them into positive and negative themes with counts and short excerpts.
- Flag competitor weaknesses that match the user's strengths (opportunities) and competitor strengths the user lacks (risks).
- **Done when:** top review themes per competitor appear for the period, with counts and examples.

### F12. Alerts
- Real-time delivery for `high` importance events via Email, Slack and WhatsApp or Telegram. WhatsApp matters for non-tech businesses.
- Message format: what changed → why it matters → your status → source link.
- Per-workspace channel settings, minimum importance and digest mode.
- **Done when:** alerts follow that format and respect the settings.

### F13. Weekly intelligence brief
- A scheduled job generates a `Brief` for the past 7 days from stored data.
- Sections:
  1. Top 3–5 developments (what changed, why it matters, your status, evidence, what to look into)
  2. Scorecard change and rank movement
  3. Risks
  4. New and widening lag items, gaps closed
  5. Active patterns
  6. Customer review themes
- Written in plain business language, not tech jargon, since users may not be technical.
- Delivered by email and other channels, and stored in the dashboard.
- **Done when:** a brief is generated and delivered end-to-end with no manual steps.

### F14. Dashboard
- Home view led by the **overall scorecard and rank** and the **top 5 lag items**, followed by Important changes, Strengths, Patterns and Review themes.
- Navigation to competitors, timeline, offering matrix, price comparison and past briefs.
- **Done when:** a user can grasp the week's competitive picture in under a minute.

### F15. Ask the intelligence (later phase)
- A chat interface over stored events, offerings, reviews and patterns, e.g. "What has Competitor B changed in pricing this year?"
- Answers must cite stored events and sources only, with no unsupported claims.
- **Done when:** answers are grounded in stored data and linked to evidence.

---

## 6. Build order

> Superseded in detail by the 10-phase MVP plan in `docs/ROADMAP.md`.

1. **Foundation:** project setup, auth, workspace, domain model, source adapter interface, fetch → normalize → hash → snapshot (F3).
2. **Events:** LLM classification with schema validation (F4), dedup (F5), importance (F6), timeline (F7).
3. **Onboarding:** business profile extraction (F1), industry-aware source discovery (F2).
4. **Comparison (core):** offering taxonomy, matrix and price comparison (F8), metric config for 2 industries, comparison engine (F9), comparison views (F9b).
5. **Intelligence:** patterns (F10), review intelligence (F11).
6. **Delivery:** alerts (F12), weekly brief (F13), dashboard (F14).
7. **Later:** ask the intelligence (F15).

Build a basic version of each phase before moving on. Start with 2–3 source adapters (website, Google News, one review source) and test with real businesses from **at least 2 different industries** early, to confirm the model is truly industry-agnostic.

---

## 7. Non-goals (for now)

- Scraping behind logins, or scraping that violates platform terms. Use official APIs where required.
- Private data sources, paid databases or data purchasing.
- Telling users what to do. The system suggests what to look into.
- Team roles and permissions, and billing.
- Mobile apps. Web first.

---

## 8. Tech decisions

> Current proposal and decision log: `docs/DECISIONS.md`.

Not decided yet. Propose options with trade-offs before starting, and consider:
- Scheduled jobs and queues for long-running fetch and LLM work. Serverless time limits matter if deploying serverless.
- A database that handles both flexible event payloads and relational queries (matrix, gaps, patterns).
- An LLM provider with reliable structured JSON output and low cost per call.
- Headless browser support for JavaScript-rendered pages, used only where needed.
- Embedding and similarity search for dedup and offering matching.

---

## 9. Known hard problems

- **Offering normalization across industries.** Competitors describe the same thing differently ("same-day delivery" vs. "express dispatch"). If mapping is wrong, gaps are wrong with high confidence. Mitigations: an alias table, LLM matching against the existing taxonomy before creating new entries, and user corrections feeding aliases.
- **Diverse source formats.** Menus, catalogs, listings and pricing pages vary wildly. Mitigations: adapter per source type, generic content extraction as fallback, LLM extraction only on diffs.
- **Diff noise.** Dynamic pages, A/B tests and rotating promotions cause false changes. Mitigations: normalization before hashing, and requiring website changes to persist across 2 fetches.
- **Price comparison.** Different units, currencies, bundles and plans. Store currency and unit explicitly, and only compare offerings mapped to the same `Offering`.
- **LLM cost.** Send diffs only, never full pages. Cache results by content hash and batch calls.
- **Fair scoring with missing data.** Competitors will have different amounts of public data. Scores must exclude unknown metrics instead of treating them as zero, and show data coverage per dimension so a low score isn't just missing data.
- **User's own data accuracy.** The comparison is wrong if the user's profile is wrong. Prompt the user to confirm key values and show origin on every metric.
- **Local businesses.** Location matters. Competitors and relevance depend on region.

---

## 10. Conventions for the assistant

- TypeScript strict mode. Every LLM output is schema-validated before storage.
- Prompts live in a `prompts/` directory, are versioned, and the version is stored on each event.
- Pipeline steps are idempotent and safe to re-run.
- Business logic (thresholds, scoring, gap rules, industry source mappings) lives in code and config, never in prompts.
- Every user-facing insight must reference stored evidence.
- User-facing text uses plain business language.
