// Queue names (SYSTEM_DESIGN §10). Centralized so producers and consumers never typo a string.
// process-event (dedup, importance, storing the Event row - SYSTEM_DESIGN §4.3) is Phase 5;
// extract-events currently ends at validated candidate events, logged but not yet persisted.
export const QUEUE_NAMES = {
  system: 'system',
  fetchSource: 'fetch-source',
  extractEvents: 'extract-events',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type FetchSourceJobData = { sourceId: string };
export type ExtractEventsJobData = { sourceId: string; snapshotId: string };
