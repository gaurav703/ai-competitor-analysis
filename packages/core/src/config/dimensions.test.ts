import { describe, expect, it } from 'vitest';
import { DIMENSION_KEYS } from '../domain/metric';
import { DEFAULT_DIMENSION_WEIGHTS, DIMENSIONS, getDimension } from './dimensions';

describe('DIMENSIONS', () => {
  it('has exactly the 10 fixed dimension keys, once each (spec §2A)', () => {
    expect(DIMENSIONS.map((d) => d.key).sort()).toEqual([...DIMENSION_KEYS].sort());
  });

  it('gives every dimension a positive default weight', () => {
    for (const d of DIMENSIONS) {
      expect(d.defaultWeight).toBeGreaterThan(0);
    }
  });

  it('keys DEFAULT_DIMENSION_WEIGHTS the same as DIMENSIONS', () => {
    expect(Object.keys(DEFAULT_DIMENSION_WEIGHTS).sort()).toEqual([...DIMENSION_KEYS].sort());
  });
});

describe('getDimension', () => {
  it('returns the matching dimension', () => {
    expect(getDimension('pricing').name).toBe('Pricing & value');
  });
});
