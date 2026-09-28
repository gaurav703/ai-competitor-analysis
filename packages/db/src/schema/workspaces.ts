import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { BusinessProfile, IndustryCategory } from '@cip/core';

export type AlertSettings = {
  channels: ('email' | 'telegram')[];
  minImportance: 'low' | 'medium' | 'high';
  digestMode: boolean;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  channels: ['email'],
  minImportance: 'high',
  digestMode: false,
};

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Supabase Auth user id (auth.users.id). Every query must be scoped by owner.
    ownerId: uuid('owner_id').notNull(),
    name: text('name').notNull(),
    industry: text('industry').notNull(),
    industryCategory: text('industry_category').$type<IndustryCategory>().notNull(),
    region: text('region'),
    // Null until F1 onboarding extracts and the user confirms it (Phase 6).
    businessProfile: jsonb('business_profile').$type<BusinessProfile>(),
    alertSettings: jsonb('alert_settings')
      .$type<AlertSettings>()
      .notNull()
      .default(DEFAULT_ALERT_SETTINGS),
    // null = use default weights from config
    dimensionWeights: jsonb('dimension_weights').$type<Record<string, number>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('workspaces_owner_id_idx').on(t.ownerId)],
).enableRLS(); // No policies: blocks Supabase's public Data API. The app connects as the DB owner.

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
