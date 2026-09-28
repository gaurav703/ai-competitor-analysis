import { resolve } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { config } from 'dotenv';
import type { IndustryCategory } from '@cip/core';
import { DIMENSIONS, getMetricDefinitions, getSuggestedSourceTypes } from '@cip/core';
import { createDb, type Database } from './client';
import { competitors, metricValues, offerings, priceEntries, sources, workspaces } from './schema';

// Run from repo root or from packages/db - resolve .env by path, not cwd.
config({ path: resolve(import.meta.dirname, '../../../.env'), quiet: true });

// Phase 2 done-when (docs/ROADMAP.md): "migrations run, seed creates a demo workspace per
// industry, and config loads with type checks." This script proves both halves: it exercises
// every table added this phase, and it only compiles/runs if the industry config (dimensions,
// metric definitions, source suggestions) type-checks and loads without throwing.
//
// Demo data isn't tied to a real Supabase Auth user, so it won't show up on anyone's
// dashboard - that's expected until Phase 6 (onboarding). Safe to re-run: each workspace is
// looked up by (ownerId, name) first and skipped if it already exists.
const DEMO_OWNER_ID = '00000000-0000-0000-0000-000000000000';

type DemoWorkspace = {
  name: string;
  industry: string;
  industryCategory: IndustryCategory;
  region?: string;
  competitorNames: [string, string];
  offerings: [{ name: string; category: string }, { name: string; category: string }];
  priceLabel: string;
  priceAmount: string;
  currency: string;
};

const DEMOS: DemoWorkspace[] = [
  {
    name: 'Demo: Spice Route Kitchen',
    industry: 'Restaurant',
    industryCategory: 'food_hospitality',
    region: 'Pune, India',
    competitorNames: ['Biryani Junction', 'Curry Leaf Express'],
    offerings: [
      { name: 'Home delivery', category: 'Fulfilment' },
      { name: 'Lunch combo', category: 'Menu' },
    ],
    priceLabel: 'Thali (lunch)',
    priceAmount: '249.00',
    currency: 'INR',
  },
  {
    name: 'Demo: Flowly',
    industry: 'B2B SaaS - workflow automation',
    industryCategory: 'software',
    competitorNames: ['Zapier', 'Make'],
    offerings: [
      { name: 'WhatsApp integration', category: 'Integrations' },
      { name: 'AI workflow builder', category: 'Product' },
    ],
    priceLabel: 'Starter plan',
    priceAmount: '29.00',
    currency: 'USD',
  },
];

async function seedWorkspace(db: Database, demo: DemoWorkspace): Promise<void> {
  const [existing] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.ownerId, DEMO_OWNER_ID), eq(workspaces.name, demo.name)))
    .limit(1);
  if (existing) {
    console.log(`  skip "${demo.name}" (already seeded)`);
    return;
  }

  const [workspace] = await db
    .insert(workspaces)
    .values({
      ownerId: DEMO_OWNER_ID,
      name: demo.name,
      industry: demo.industry,
      industryCategory: demo.industryCategory,
      region: demo.region,
    })
    .returning();
  if (!workspace) throw new Error(`Failed to insert workspace "${demo.name}"`);

  const insertedCompetitors = await db
    .insert(competitors)
    .values(demo.competitorNames.map((name) => ({ workspaceId: workspace.id, name })))
    .returning();
  const [competitorA] = insertedCompetitors;
  if (!competitorA) throw new Error(`Failed to insert competitors for "${demo.name}"`);

  const insertedOfferings = await db
    .insert(offerings)
    .values(demo.offerings.map((o) => ({ workspaceId: workspace.id, ...o })))
    .returning();
  const [offeringA] = insertedOfferings;
  if (!offeringA) throw new Error(`Failed to insert offerings for "${demo.name}"`);

  const [firstSuggestedType] = getSuggestedSourceTypes(demo.industryCategory);
  if (!firstSuggestedType) throw new Error(`No suggested sources for ${demo.industryCategory}`);
  await db.insert(sources).values({
    workspaceId: workspace.id,
    subjectType: 'competitor',
    subjectId: competitorA.id,
    type: firstSuggestedType,
    url: `https://example.com/${competitorA.name.toLowerCase().replace(/\s+/g, '-')}`,
  });

  await db.insert(priceEntries).values({
    workspaceId: workspace.id,
    offeringId: offeringA.id,
    subjectType: 'self',
    label: demo.priceLabel,
    amount: demo.priceAmount,
    currency: demo.currency,
    observedAt: new Date(),
  });

  // One MetricValue against a real built-in metric definition, proving config -> DB end-to-end.
  const metricDefs = getMetricDefinitions(demo.industryCategory);
  const firstMetric = metricDefs[0];
  if (firstMetric) {
    await db.insert(metricValues).values({
      workspaceId: workspace.id,
      metricId: firstMetric.id,
      subjectType: 'self',
      value: firstMetric.valueType === 'boolean' ? true : 1,
      origin: 'user_entered',
      confidence: 'high',
      observedAt: new Date(),
    });
  }

  console.log(
    `  created "${demo.name}": ${insertedCompetitors.length} competitors, ${insertedOfferings.length} offerings, ` +
      `${metricDefs.length} built-in metrics available (${demo.industryCategory})`,
  );
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required. Check .env');

  console.log(`Config: ${DIMENSIONS.length} dimensions loaded.`);

  const { db, close } = createDb(databaseUrl, { max: 1 });
  try {
    console.log('Seeding demo workspaces...');
    for (const demo of DEMOS) {
      await seedWorkspace(db, demo);
    }
    console.log('Done.');
  } finally {
    await close();
  }
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
