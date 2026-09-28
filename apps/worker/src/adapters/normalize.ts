import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import type { NormalizedContent } from './types';

// Strip everything that changes without the page's actual content changing (F3 done-when:
// "a cosmetic change gives no diff"): scripts, styles, nav, footers, cookie banners, and
// anything carrying a live timestamp/session token.
const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'nav',
  'footer',
  'header',
  'iframe',
  'svg',
  '[class*="cookie"]',
  '[id*="cookie"]',
  '[class*="banner"]',
  '[aria-label*="cookie" i]',
  'time',
  '[class*="timestamp"]',
  '[data-timestamp]',
];

function stripNoise(html: string): cheerio.CheerioAPI {
  const $ = cheerio.load(html);
  $(NOISE_SELECTORS.join(',')).remove();
  return $;
}

function collapseWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .replace(/[ \t]{2,}/g, ' ');
}

// Website pages (marketing/article-like): try Readability's main-content extraction first
// (works well for blogs/changelogs), fall back to a stripped full-body text (works for
// pricing pages, menus, catalogs - anything Readability doesn't recognize as an "article").
export function normalizeWebsiteHtml(html: string, url: string): NormalizedContent {
  try {
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();
    if (article?.textContent && article.textContent.trim().length > 200) {
      return { text: collapseWhitespace(article.textContent), title: article.title ?? undefined };
    }
  } catch {
    // Readability can throw on malformed markup - fall through to the cheerio path.
  }

  const $ = stripNoise(html);
  const title = $('title').first().text().trim() || undefined;
  const text = collapseWhitespace($('body').text());
  return { text, title };
}
