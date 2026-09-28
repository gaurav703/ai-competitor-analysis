import { describe, expect, it } from 'vitest';
import { DIMENSION_KEYS } from '../domain/metric';
import { ALL_METRIC_DEFINITIONS, getMetricDefinition, getMetricDefinitions } from './metrics';

describe('ALL_METRIC_DEFINITIONS', () => {
  it('has no duplicate ids across industries', () => {
    const ids = ALL_METRIC_DEFINITIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every dimension for both Phase 2 industries (spec §2A)', () => {
    for (const industry of ['food_hospitality', 'software'] as const) {
      const dims = new Set(getMetricDefinitions(industry).map((m) => m.dimensionKey));
      for (const key of DIMENSION_KEYS) {
        expect(dims.has(key), `${industry} is missing a metric for dimension "${key}"`).toBe(true);
      }
    }
  });
});

describe('getMetricDefinitions', () => {
  it('only returns metrics tagged for the requested industry', () => {
    const restaurantOnly = getMetricDefinitions('food_hospitality');
    expect(restaurantOnly.every((m) => m.industryCategories.includes('food_hospitality'))).toBe(
      true,
    );
    expect(restaurantOnly.some((m) => m.id === 'menu_item_count')).toBe(true);
    expect(restaurantOnly.some((m) => m.id === 'entry_price_monthly')).toBe(false);
  });

  it('includes metrics shared across industries in both lists', () => {
    expect(getMetricDefinitions('food_hospitality').some((m) => m.id === 'review_count')).toBe(
      true,
    );
    expect(getMetricDefinitions('software').some((m) => m.id === 'review_count')).toBe(true);
  });
});

describe('getMetricDefinition', () => {
  it('finds a known metric by id', () => {
    expect(getMetricDefinition('avg_dish_price')?.dimensionKey).toBe('pricing');
  });

  it('returns undefined for an unknown id', () => {
    expect(getMetricDefinition('does_not_exist')).toBeUndefined();
  });
});
