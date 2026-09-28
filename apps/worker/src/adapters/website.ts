import type { Source } from '@cip/db';
import { assertSafeUrl } from '../lib/ssrfGuard';
import { lineDiff } from './diff';
import { normalizeWebsiteHtml } from './normalize';
import type { FetchContext, RawContent, SourceAdapter } from './types';

// website (incl. pricing_page, product_catalog, menu, changelog, blog) - a single adapter
// covers all of these SourceTypes; they only differ by URL, not by fetch/normalize logic
// (SYSTEM_DESIGN §11). Playwright fallback for `config.jsRendered` sources is not wired up
// yet (deferred: needs a browser binary in the worker image) - such sources fail clearly
// instead of silently returning an empty page.
export const websiteAdapter: SourceAdapter = {
  type: 'website',

  async fetch(source: Source, ctx: FetchContext): Promise<RawContent> {
    await assertSafeUrl(source.url);

    if (source.config?.jsRendered) {
      throw new Error(
        `Source ${source.id} needs JS rendering (config.jsRendered) - Playwright fallback isn't wired up yet`,
      );
    }

    const res = await fetch(source.url, {
      headers: { 'User-Agent': ctx.userAgent },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText} for ${source.url}`);

    const contentType = res.headers.get('content-type') ?? 'text/html';
    const body = await res.text();
    return { url: res.url || source.url, body, contentType, fetchedAt: new Date() };
  },

  normalize(raw: RawContent) {
    return normalizeWebsiteHtml(raw.body, raw.url);
  },

  diff: lineDiff,
};
