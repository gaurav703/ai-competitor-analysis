import 'server-only';
import * as cheerio from 'cheerio';
import { assertSafeUrl } from './ssrfGuard';

const USER_AGENT =
  'CompetitiveIntelligencePlatform/0.1 (+https://github.com/gaurav703/ai-competitor-analysis)';

// One-off homepage fetch for onboarding (F1): a rough text extraction is enough to give the
// LLM real context, unlike apps/worker's adapters which need precise diffing over time - so
// this skips Readability/normalization-for-hashing and just strips markup.
export async function fetchWebsiteText(url: string): Promise<string | undefined> {
  try {
    await assertSafeUrl(url);
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return undefined;
    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, noscript, nav, footer, header, iframe, svg').remove();
    const text = $('body')
      .text()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
      .replace(/[ \t]{2,}/g, ' ');
    return text.length > 0 ? text : undefined;
  } catch {
    // A failed fetch just means the LLM works from the user's typed description alone.
    return undefined;
  }
}
