import gplay, { type IReviewsItem } from 'google-play-scraper';
import type { Source } from '@cip/db';
import type { FeedItem, FetchContext, NormalizedContent, RawContent, SourceAdapter } from './types';

// play_store: the MVP review source (spec build order: "one review source"). Chosen over
// Google Business/Places because it needs no API key - Play Store review data is public and
// gplay's official-looking client just calls Play's own public web endpoints. Google Business
// (via the Places API) is a natural follow-up once GOOGLE_PLACES_API_KEY is configured.
//
// source.config.appId (e.g. "com.example.app") is required; falls back to parsing `?id=` out
// of a play.google.com URL in source.url if config.appId is absent.

function resolveAppId(source: Source): string {
  const fromConfig = source.config?.appId;
  if (typeof fromConfig === 'string' && fromConfig.length > 0) return fromConfig;

  const parsed = new URL(source.url);
  const id = parsed.searchParams.get('id');
  if (id) return id;

  throw new Error(
    `Source ${source.id}: play_store needs config.appId or a play.google.com URL with ?id=`,
  );
}

export const playStoreReviewsAdapter: SourceAdapter = {
  type: 'play_store',

  async fetch(source: Source, _ctx: FetchContext): Promise<RawContent> {
    const appId = resolveAppId(source);
    // gplay's own .d.ts types `sort` as the enum member type rather than the full enum
    // object, so `gplay.sort.NEWEST` doesn't type-check even though it exists at runtime.
    // NEWEST = 2 (see google-play-scraper's index.d.ts).
    const result = await gplay.reviews({ appId, sort: 2, num: 50 });
    return {
      url: source.url,
      body: JSON.stringify(result.data),
      contentType: 'application/json',
      fetchedAt: new Date(),
    };
  },

  normalize(raw: RawContent): NormalizedContent {
    // Reviews are handled as feed items (items()), not diffed as free text.
    return { text: raw.body };
  },

  async items(_content: NormalizedContent, raw: RawContent): Promise<FeedItem[]> {
    const reviews = JSON.parse(raw.body) as IReviewsItem[];
    return reviews.map((r) => ({
      externalId: r.id,
      publishedAt: r.date ? new Date(r.date) : undefined,
      raw: { title: r.title, text: r.text, score: r.score, userName: r.userName, url: r.url },
    }));
  },
};
