import { index, numeric, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core';
import type { SubjectType } from '@cip/core';
import { workspaces } from './workspaces';
import { sources } from './monitoring';

// Embedding size is a placeholder pending the Phase 4 embedding-model choice (D-002 leaves
// EMBEDDING_MODEL unset). 768 matches common free embedding models; changing it later means a
// new migration that drops and recreates the column, since pgvector fixes dimension at column
// creation.
export const EMBEDDING_DIMENSIONS = 768;

// Offering (spec §4): the canonical taxonomy that makes cross-industry comparison possible.
export const offerings = pgTable(
  'offerings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').notNull(),
    aliases: text('aliases').array().notNull().default([]),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('offerings_workspace_id_idx').on(t.workspaceId)],
).enableRLS();

export type Offering = typeof offerings.$inferSelect;
export type NewOffering = typeof offerings.$inferInsert;

// PriceEntry (spec §4). subjectType/subjectId identify whose price this is (self or one
// competitor) - the spec sketch embeds PriceEntry inside BusinessProfile/Competitor, but a
// relational table lets the price position map (F9b) and price history query directly.
export const priceEntries = pgTable(
  'price_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    offeringId: uuid('offering_id').references(() => offerings.id, { onDelete: 'set null' }),
    subjectType: text('subject_type').$type<SubjectType>().notNull(),
    subjectId: uuid('subject_id'), // references competitors.id when subjectType = 'competitor'
    label: text('label').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull(), // ISO 4217, e.g. "INR"
    unit: text('unit'),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
    sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('price_entries_workspace_id_idx').on(t.workspaceId),
    index('price_entries_offering_id_idx').on(t.offeringId),
    index('price_entries_subject_idx').on(t.subjectType, t.subjectId),
  ],
).enableRLS();

export type PriceEntry = typeof priceEntries.$inferSelect;
export type NewPriceEntry = typeof priceEntries.$inferInsert;
