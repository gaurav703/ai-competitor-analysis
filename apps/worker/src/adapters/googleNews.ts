import Parser from 'rss-parser';
import type { Source } from '@cip/db';
import { assertSafeUrl } from '../lib/ssrfGuard';
import type { FeedItem, FetchContext, NormalizedContent, RawContent, SourceAdapter } from './types';

const parser = new Parser({ timeout: 20_000 });

// google_news: Google News RSS for a competitor-name query (SYSTEM_DESIGN §11). New items are
// the unit of change here, not a text diff - source.url is expected to already be a full
// Google News RSS query URL (e.g. https://news.google.com/rss/search?q=%22Acme+Inc%22).
export const googleNewsAdapter: SourceAdapter = {
  type: 'google_news',

  async fetch(source: Source, ctx: FetchContext): Promise<RawContent> {
    await assertSafeUrl(source.url);
    const res = await fetch(source.url, {
      headers: { 'User-Agent': ctx.userAgent },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText} for ${source.url}`);
    const body = await res.text();
    return { url: source.url, body, contentType: 'application/rss+xml', fetchedAt: new Date() };
  },

  normalize(raw: RawContent): NormalizedContent {
    // The feed itself is the content; normalization happens per-item in items() instead.
    return { text: raw.body };
  },

  async items(_content: NormalizedContent, raw: RawContent): Promise<FeedItem[]> {
    const feed = await parser.parseString(raw.body);
    return (feed.items ?? [])
      .filter((item) => item.guid || item.link)
      .map((item) => ({
        externalId: item.guid ?? item.link ?? '',
        publishedAt: item.isoDate ? new Date(item.isoDate) : undefined,
        raw: {
          title: item.title,
          link: item.link,
          contentSnippet: item.contentSnippet,
          source: item.creator ?? item.author,
        },
      }));
  },
};
