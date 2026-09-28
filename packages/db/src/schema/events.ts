import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import type { EventType, ImportanceLevel } from '@cip/core';
import { workspaces } from './workspaces';
import { competitors, snapshots, sources } from './monitoring';
import { EMBEDDING_DIMENSIONS, offerings } from './catalog';

// Event (spec §4). `structured` is type-specific and Zod-validated against the per-type
// shape defined in Phase 4; here it's just JSONB.
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    competitorId: uuid('competitor_id')
      .notNull()
      .references(() => competitors.id, { onDelete: 'cascade' }),
    type: text('type').$type<EventType>().notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    structured: jsonb('structured').$type<Record<string, unknown>>().notNull().default({}),
    importance: text('importance').$type<ImportanceLevel>().notNull(),
    importanceReason: text('importance_reason').notNull(),
    dedupKey: text('dedup_key').notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    promptVersion: text('prompt_version'), // absent for non-LLM/manual events
    occurredAt: timestamp('occurred_at', { withTimezone: true }), // not always knowable precisely
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('events_workspace_id_idx').on(t.workspaceId),
    index('events_competitor_id_idx').on(t.competitorId),
    index('events_dedup_key_idx').on(t.dedupKey),
  ],
).enableRLS();

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// Many-to-many junctions (spec §4: sourceIds[], snapshotIds[], offeringsAffected[]).
export const eventSources = pgTable(
  'event_sources',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.sourceId] }),
    index('event_sources_source_id_idx').on(t.sourceId),
  ],
).enableRLS();

export const eventSnapshots = pgTable(
  'event_snapshots',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.snapshotId] }),
    index('event_snapshots_snapshot_id_idx').on(t.snapshotId),
  ],
).enableRLS();

export const eventOfferings = pgTable(
  'event_offerings',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    offeringId: uuid('offering_id')
      .notNull()
      .references(() => offerings.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.offeringId] }),
    index('event_offerings_offering_id_idx').on(t.offeringId),
  ],
).enableRLS();
