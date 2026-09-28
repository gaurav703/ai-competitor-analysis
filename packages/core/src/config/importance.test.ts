import { describe, expect, it } from 'vitest';
import { EVENT_TYPE_BASE_WEIGHT, getEventTypeWeight, importanceLevelForScore } from './importance';

describe('getEventTypeWeight', () => {
  it('falls back to the base weight when no industry override exists', () => {
    expect(getEventTypeWeight('hiring', 'food_hospitality')).toBe(EVENT_TYPE_BASE_WEIGHT.hiring);
  });

  it('applies an industry override when one is configured', () => {
    expect(getEventTypeWeight('app_release', 'software')).toBe(3);
    expect(getEventTypeWeight('app_release', 'food_hospitality')).toBe(
      EVENT_TYPE_BASE_WEIGHT.app_release,
    );
  });
});

describe('importanceLevelForScore', () => {
  it('buckets scores into low / medium / high at the configured thresholds', () => {
    expect(importanceLevelForScore(0)).toBe('low');
    expect(importanceLevelForScore(2)).toBe('low');
    expect(importanceLevelForScore(3)).toBe('medium');
    expect(importanceLevelForScore(5)).toBe('medium');
    expect(importanceLevelForScore(6)).toBe('high');
    expect(importanceLevelForScore(10)).toBe('high');
  });
});
