import { z } from 'zod';
import type { SourceType } from '../domain/monitoring';
import { SOURCE_TYPES } from '../domain/monitoring';
import type { IndustryCategory } from './industries';
import { INDUSTRY_CATEGORIES } from './industries';

// Industry-aware source discovery (spec §5 F2): suggested source types per industry category.
// The user confirms, removes or adds - this list only seeds the suggestion, it never hardcodes
// pipeline behavior (one adapter per SourceType handles all industries the same way).
const suggestionsSchema = z.record(
  z.enum(INDUSTRY_CATEGORIES),
  z.array(z.enum(SOURCE_TYPES)).min(1),
);

export const INDUSTRY_SOURCE_SUGGESTIONS: Record<IndustryCategory, SourceType[]> =
  suggestionsSchema.parse({
    software: [
      'website',
      'pricing_page',
      'changelog',
      'app_store',
      'google_news',
      'reddit',
      'jobs',
    ],
    ecommerce: ['website', 'product_catalog', 'marketplace_listing', 'social', 'google_news'],
    food_hospitality: [
      'website',
      'menu',
      'google_business',
      'marketplace_listing',
      'social',
      'google_news',
    ],
    retail: ['website', 'product_catalog', 'google_business', 'marketplace_listing', 'social'],
    services: ['website', 'google_business', 'social', 'google_news'],
    manufacturing: ['website', 'product_catalog', 'google_news', 'jobs'],
    real_estate: ['website', 'product_catalog', 'google_news', 'social'],
    healthcare: ['website', 'google_business', 'google_news'],
    education: ['website', 'google_news', 'social'],
    other: ['website', 'google_news', 'social'],
  });

export function getSuggestedSourceTypes(industryCategory: IndustryCategory): SourceType[] {
  return INDUSTRY_SOURCE_SUGGESTIONS[industryCategory];
}
