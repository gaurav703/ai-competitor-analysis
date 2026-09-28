// Queue names (SYSTEM_DESIGN §10). Centralized so producers and consumers never typo a string.
export const QUEUE_NAMES = {
  system: 'system',
  fetchSource: 'fetch-source',
  extractEvents: 'extract-events',
  processEvent: 'process-event',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type FetchSourceJobData = { sourceId: string };
export type ExtractEventsJobData = { sourceId: string; snapshotId: string };
export type ProcessEventJobData = {
  workspaceId: string;
  competitorId: string;
  candidate: unknown; // ExtractedEvent from packages/prompts, validated again on consume
};
