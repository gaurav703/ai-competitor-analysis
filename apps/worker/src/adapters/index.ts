import type { SourceType } from '@cip/core';
import { googleNewsAdapter } from './googleNews';
import { playStoreReviewsAdapter } from './playStoreReviews';
import type { SourceAdapter } from './types';
import { websiteAdapter } from './website';

// One adapter per SourceType (SYSTEM_DESIGN §11: "adding a source type = one new adapter, no
// pipeline changes"). The generic HTML adapter covers every page-shaped source type - they
// only differ by which URL the user points at, not by fetch/normalize logic.
const HTML_ADAPTER_TYPES: SourceType[] = [
  'website',
  'pricing_page',
  'product_catalog',
  'menu',
  'changelog',
  'blog',
];

const registry = new Map<SourceType, SourceAdapter>([
  ...HTML_ADAPTER_TYPES.map((t): [SourceType, SourceAdapter] => [
    t,
    { ...websiteAdapter, type: t },
  ]),
  ['google_news', googleNewsAdapter],
  ['play_store', playStoreReviewsAdapter],
]);

export function getAdapter(type: SourceType): SourceAdapter {
  const adapter = registry.get(type);
  if (!adapter) {
    throw new Error(
      `No adapter for source type "${type}" yet (MVP covers website-shaped sources, google_news, play_store)`,
    );
  }
  return adapter;
}

export function hasAdapter(type: SourceType): boolean {
  return registry.has(type);
}
