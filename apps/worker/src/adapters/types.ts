import type { Source } from '@cip/db';

// SourceAdapter contract (SYSTEM_DESIGN §11). One adapter per SourceType; adding a source
// type means writing one adapter, no pipeline change.

export type RawContent = {
  url: string; // the fetched URL (post-redirect), needed by some normalizers (e.g. Readability)
  body: string; // raw bytes as text (HTML, RSS XML, JSON, ...)
  contentType: string;
  fetchedAt: Date;
};

export type NormalizedContent = {
  text: string; // stripped of nav/footer/banners/timestamps - what gets hashed
  title?: string;
};

export type ContentDiff = {
  hasChange: boolean;
  addedLines: string[];
  removedLines: string[];
};

// A discrete new thing found in a feed/list source (news items, reviews) - used instead of
// diff() for sources where "new item" is the natural unit of change.
export type FeedItem = {
  externalId: string; // stable id for dedup across fetches (guid, review id, ...)
  publishedAt?: Date;
  raw: Record<string, unknown>;
};

export type FetchContext = {
  // Per-domain limiter + robots.txt check happen in the job runner, before fetch() is called,
  // but adapters get the resolved delay/allow decision so they can also respect it on any
  // secondary requests they make internally (e.g. paginated feeds).
  userAgent: string;
};

export interface SourceAdapter {
  type: Source['type'];
  fetch(source: Source, ctx: FetchContext): Promise<RawContent>;
  normalize(raw: RawContent): NormalizedContent;
  // Text/line diff is the default (website-style sources). Feed/list sources implement
  // items() instead and skip diff().
  diff?(prev: NormalizedContent, next: NormalizedContent): ContentDiff;
  items?(content: NormalizedContent, raw: RawContent): Promise<FeedItem[]>;
}
