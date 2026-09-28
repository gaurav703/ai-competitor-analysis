import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { SourceStatus, SourceType, SubjectType } from '@cip/core';
import { workspaces } from './workspaces';

// Competitor (spec §4). Offerings/pricing are derived from events (F3-F8), not stored here.
export const competitors = pgTable(
  'competitors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    website: text('website'),
    locations: text('locations').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('competitors_workspace_id_idx').on(t.workspaceId)],
).enableRLS();

export type Competitor = typeof competitors.$inferSelect;
export type NewCompetitor = typeof competitors.$inferInsert;

// Source (spec §4). subjectType/subjectId point at the user's own business (subjectId null)
// or one competitor - one table for both, per SYSTEM_DESIGN §5.1.
export const sources = pgTable(
  'sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    subjectType: text('subject_type').$type<SubjectType>().notNull(),
    subjectId: uuid('subject_id'), // references competitors.id when subjectType = 'competitor'
    type: text('type').$type<SourceType>().notNull(),
    url: text('url').notNull(),
    config: jsonb('config').$type<Record<string, unknown>>(),
    lastHash: text('last_hash'),
    pendingHash: text('pending_hash'), // awaiting the 2nd confirming fetch (F3, THRESHOLDS.websiteConfirmFetches)
    lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
    status: text('status').$type<SourceStatus>().notNull().default('active'),
    errorCount: integer('error_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('sources_workspace_id_idx').on(t.workspaceId),
    index('sources_subject_idx').on(t.subjectType, t.subjectId),
  ],
).enableRLS();

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

// Snapshot (spec §4): raw evidence. Never edited, only ever inserted.
export const snapshots = pgTable(
  'snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    hash: text('hash').notNull(),
    content: text('content').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('snapshots_workspace_id_idx').on(t.workspaceId),
    index('snapshots_source_id_idx').on(t.sourceId),
  ],
).enableRLS();

export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
