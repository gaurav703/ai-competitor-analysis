import { describe, expect, it } from 'vitest';
import { scoreImportance } from './importance';

const baseCtx = { industryCategory: 'software' as const, userOfferingIds: new Set<string>() };

describe('scoreImportance', () => {
  it('scores higher when the event touches an offering the user lacks vs. one they have', () => {
    const lacking = scoreImportance(
      { type: 'new_offering', offeringsAffected: [{ id: 'off-1' }] },
      { ...baseCtx, userOfferingIds: new Set() },
    );
    const has = scoreImportance(
      { type: 'new_offering', offeringsAffected: [{ id: 'off-1' }] },
      { ...baseCtx, userOfferingIds: new Set(['off-1']) },
    );
    expect(lacking.score).toBeGreaterThan(has.score);
    expect(lacking.reason).toContain("don't have");
    expect(has.reason).toContain('also have');
  });

  it('applies the region bonus only when self and event regions match', () => {
    const sameRegion = scoreImportance(
      { type: 'expansion', offeringsAffected: [] },
      { ...baseCtx, userRegion: 'Pune', eventRegion: 'Pune, India' },
    );
    const noRegion = scoreImportance(
      { type: 'expansion', offeringsAffected: [] },
      { ...baseCtx, userRegion: 'Pune', eventRegion: 'Mumbai' },
    );
    expect(sameRegion.score).toBeGreaterThan(noRegion.score);
    expect(sameRegion.reason).toContain('your region');
  });

  it('bumps score for events part of an active pattern', () => {
    const withPattern = scoreImportance(
      { type: 'promotion', offeringsAffected: [] },
      { ...baseCtx, isPartOfActivePattern: true },
    );
    const without = scoreImportance({ type: 'promotion', offeringsAffected: [] }, baseCtx);
    expect(withPattern.score).toBeGreaterThan(without.score);
  });

  it('applies a per-industry event-type override (software: app_release)', () => {
    const software = scoreImportance({ type: 'app_release', offeringsAffected: [] }, baseCtx);
    const restaurant = scoreImportance(
      { type: 'app_release', offeringsAffected: [] },
      { ...baseCtx, industryCategory: 'food_hospitality' },
    );
    expect(software.score).toBeGreaterThan(restaurant.score);
  });

  it('always returns a non-empty explanation', () => {
    const result = scoreImportance({ type: 'other', offeringsAffected: [] }, baseCtx);
    expect(result.reason.length).toBeGreaterThan(0);
    expect(['low', 'medium', 'high']).toContain(result.level);
  });
});
