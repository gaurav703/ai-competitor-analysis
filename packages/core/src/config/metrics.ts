import { z } from 'zod';
import type { MetricDefinition } from '../domain/metric';
import { metricDefinitionSchema } from '../domain/metric';
import type { IndustryCategory } from './industries';

// Built-in metric definitions per industry (spec §2A example metrics, §4 MetricDefinition;
// SYSTEM_DESIGN §5.2: "built-in ones live in code config; only custom metrics are stored in
// the DB"). MVP covers the two Phase-2 proof industries; adding a third industry is a new
// array here, no pipeline change.
//
// `id` is a stable slug (not a uuid), unique across ALL_METRIC_DEFINITIONS regardless of
// industry, so it can be referenced from code and prompts across releases. A metric that
// means the same thing in both industries lists both in `industryCategories` on one entry
// instead of being duplicated under the same id with different fields.

// Shared across both industries - same meaning, same or overlapping sources.
const sharedMetrics: MetricDefinition[] = [
  {
    id: 'has_mobile_app',
    dimensionKey: 'digital_presence',
    name: 'Has a mobile app',
    industryCategories: ['food_hospitality', 'software'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['app_store', 'play_store'],
  },
  {
    id: 'review_count',
    dimensionKey: 'reputation',
    name: 'Review count',
    industryCategories: ['food_hospitality', 'software'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['google_business', 'app_store'],
  },
  {
    id: 'social_post_frequency',
    dimensionKey: 'marketing',
    name: 'Social media post frequency',
    industryCategories: ['food_hospitality', 'software'],
    valueType: 'count',
    higherIsBetter: true,
    unit: 'per week',
    sourceTypes: ['social'],
  },
  {
    id: 'years_in_business',
    dimensionKey: 'trust',
    name: 'Years in business',
    industryCategories: ['food_hospitality', 'software'],
    valueType: 'number',
    higherIsBetter: true,
    unit: 'years',
    sourceTypes: ['website'],
  },
];

const foodHospitalityMetrics: MetricDefinition[] = [
  // Offerings
  {
    id: 'menu_item_count',
    dimensionKey: 'offerings',
    name: 'Menu item count',
    industryCategories: ['food_hospitality'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['menu', 'website'],
  },
  {
    id: 'has_lunch_combo',
    dimensionKey: 'offerings',
    name: 'Has a lunch combo',
    industryCategories: ['food_hospitality'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['menu', 'website'],
  },
  {
    id: 'has_vegan_range',
    dimensionKey: 'offerings',
    name: 'Has a vegan/vegetarian range',
    industryCategories: ['food_hospitality'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['menu'],
  },
  // Pricing & value
  {
    id: 'avg_dish_price',
    dimensionKey: 'pricing',
    name: 'Average dish price',
    industryCategories: ['food_hospitality'],
    valueType: 'currency',
    higherIsBetter: false,
    unit: 'per dish',
    sourceTypes: ['menu'],
  },
  {
    id: 'has_lunch_offer',
    dimensionKey: 'pricing',
    name: 'Has an active lunch offer',
    industryCategories: ['food_hospitality'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['website', 'social'],
  },
  // Customer experience
  {
    id: 'delivery_time_minutes',
    dimensionKey: 'customer_experience',
    name: 'Delivery time',
    industryCategories: ['food_hospitality'],
    valueType: 'duration',
    higherIsBetter: false,
    unit: 'minutes',
    sourceTypes: ['website', 'marketplace_listing'],
  },
  {
    id: 'has_whatsapp_ordering',
    dimensionKey: 'customer_experience',
    name: 'WhatsApp ordering',
    industryCategories: ['food_hospitality'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['website', 'social'],
  },
  {
    id: 'has_online_reservation',
    dimensionKey: 'customer_experience',
    name: 'Online reservations',
    industryCategories: ['food_hospitality'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['website'],
  },
  // Reputation & reviews
  {
    id: 'avg_rating_food',
    dimensionKey: 'reputation',
    name: 'Average rating',
    industryCategories: ['food_hospitality'],
    valueType: 'rating',
    higherIsBetter: true,
    sourceTypes: ['google_business'],
  },
  // Digital presence
  {
    id: 'google_business_completeness',
    dimensionKey: 'digital_presence',
    name: 'Google Business profile completeness',
    industryCategories: ['food_hospitality'],
    valueType: 'number',
    higherIsBetter: true,
    sourceTypes: ['google_business'],
  },
  // Marketing & brand
  {
    id: 'active_promotions_count',
    dimensionKey: 'marketing',
    name: 'Active promotions',
    industryCategories: ['food_hospitality'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['social', 'website'],
  },
  // Sales channels & reach
  {
    id: 'delivery_platform_count',
    dimensionKey: 'channels',
    name: 'Delivery platforms listed on',
    industryCategories: ['food_hospitality'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['marketplace_listing', 'website'],
  },
  {
    id: 'location_count',
    dimensionKey: 'channels',
    name: 'Number of locations',
    industryCategories: ['food_hospitality'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['website', 'google_business'],
  },
  // Innovation speed
  {
    id: 'new_menu_items_per_quarter',
    dimensionKey: 'innovation',
    name: 'New menu items per quarter',
    industryCategories: ['food_hospitality'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['menu', 'google_news'],
  },
  // Growth signals
  {
    id: 'new_location_announcements',
    dimensionKey: 'growth',
    name: 'New location announcements',
    industryCategories: ['food_hospitality'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['google_news'],
  },
  // Trust & credentials
  {
    id: 'has_food_safety_certification',
    dimensionKey: 'trust',
    name: 'Food safety certification',
    industryCategories: ['food_hospitality'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['website', 'google_news'],
  },
];

const softwareMetrics: MetricDefinition[] = [
  // Offerings
  {
    id: 'feature_count',
    dimensionKey: 'offerings',
    name: 'Feature count',
    industryCategories: ['software'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['website', 'changelog'],
  },
  {
    id: 'has_public_api',
    dimensionKey: 'offerings',
    name: 'Has a public API',
    industryCategories: ['software'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['website', 'changelog'],
  },
  {
    id: 'plan_count',
    dimensionKey: 'offerings',
    name: 'Number of pricing plans',
    industryCategories: ['software'],
    valueType: 'count',
    sourceTypes: ['pricing_page'],
  },
  // Pricing & value
  {
    id: 'entry_price_monthly',
    dimensionKey: 'pricing',
    name: 'Entry plan price',
    industryCategories: ['software'],
    valueType: 'currency',
    higherIsBetter: false,
    unit: 'per month',
    sourceTypes: ['pricing_page'],
  },
  {
    id: 'has_free_trial',
    dimensionKey: 'pricing',
    name: 'Has a free trial',
    industryCategories: ['software'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['pricing_page'],
  },
  {
    id: 'has_annual_discount',
    dimensionKey: 'pricing',
    name: 'Annual billing discount',
    industryCategories: ['software'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['pricing_page'],
  },
  // Customer experience
  {
    id: 'onboarding_steps',
    dimensionKey: 'customer_experience',
    name: 'Signup/onboarding steps',
    industryCategories: ['software'],
    valueType: 'count',
    higherIsBetter: false,
    sourceTypes: ['website'],
  },
  {
    id: 'support_channel_count',
    dimensionKey: 'customer_experience',
    name: 'Support channel count',
    industryCategories: ['software'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['website'],
  },
  {
    id: 'has_live_chat',
    dimensionKey: 'customer_experience',
    name: 'Live chat support',
    industryCategories: ['software'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['website'],
  },
  // Reputation & reviews
  {
    id: 'review_rating',
    dimensionKey: 'reputation',
    name: 'Average review rating',
    industryCategories: ['software'],
    valueType: 'rating',
    higherIsBetter: true,
    sourceTypes: ['app_store', 'reddit'],
  },
  // Digital presence
  {
    id: 'app_store_rating',
    dimensionKey: 'digital_presence',
    name: 'App store rating',
    industryCategories: ['software'],
    valueType: 'rating',
    higherIsBetter: true,
    sourceTypes: ['app_store', 'play_store'],
  },
  // Marketing & brand
  {
    id: 'blog_post_frequency',
    dimensionKey: 'marketing',
    name: 'Blog post frequency',
    industryCategories: ['software'],
    valueType: 'count',
    higherIsBetter: true,
    unit: 'per month',
    sourceTypes: ['blog'],
  },
  // Sales channels & reach
  {
    id: 'integration_count',
    dimensionKey: 'channels',
    name: 'Integration count',
    industryCategories: ['software'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['website'],
  },
  {
    id: 'regions_served_count',
    dimensionKey: 'channels',
    name: 'Regions served',
    industryCategories: ['software'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['website'],
  },
  // Innovation speed
  {
    id: 'release_frequency',
    dimensionKey: 'innovation',
    name: 'Changelog release frequency',
    industryCategories: ['software'],
    valueType: 'count',
    higherIsBetter: true,
    unit: 'per month',
    sourceTypes: ['changelog'],
  },
  {
    id: 'has_ai_features',
    dimensionKey: 'innovation',
    name: 'Has AI-assisted features',
    industryCategories: ['software'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['changelog', 'blog'],
  },
  // Growth signals
  {
    id: 'funding_total',
    dimensionKey: 'growth',
    name: 'Total funding raised',
    industryCategories: ['software'],
    valueType: 'currency',
    higherIsBetter: true,
    sourceTypes: ['google_news'],
  },
  {
    id: 'open_roles_count',
    dimensionKey: 'growth',
    name: 'Open job roles',
    industryCategories: ['software'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['jobs'],
  },
  {
    id: 'partnership_count',
    dimensionKey: 'growth',
    name: 'New partnerships (90d)',
    industryCategories: ['software'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['google_news'],
  },
  // Trust & credentials
  {
    id: 'has_soc2',
    dimensionKey: 'trust',
    name: 'SOC 2 / security certification',
    industryCategories: ['software'],
    valueType: 'boolean',
    higherIsBetter: true,
    sourceTypes: ['website'],
  },
  {
    id: 'notable_client_count',
    dimensionKey: 'trust',
    name: 'Notable clients listed',
    industryCategories: ['software'],
    valueType: 'count',
    higherIsBetter: true,
    sourceTypes: ['website'],
  },
];

export const ALL_METRIC_DEFINITIONS: MetricDefinition[] = z
  .array(metricDefinitionSchema)
  .parse([...sharedMetrics, ...foodHospitalityMetrics, ...softwareMetrics]);

// Fail fast on a config mistake (a copy-pasted id reused across two different definitions)
// rather than silently shadowing one of them in getMetricDefinition().
{
  const seen = new Set<string>();
  for (const m of ALL_METRIC_DEFINITIONS) {
    if (seen.has(m.id)) throw new Error(`Duplicate metric id in config: ${m.id}`);
    seen.add(m.id);
  }
}

export function getMetricDefinitions(industryCategory: IndustryCategory): MetricDefinition[] {
  return ALL_METRIC_DEFINITIONS.filter((m) => m.industryCategories.includes(industryCategory));
}

export function getMetricDefinition(id: string): MetricDefinition | undefined {
  return ALL_METRIC_DEFINITIONS.find((m) => m.id === id);
}
