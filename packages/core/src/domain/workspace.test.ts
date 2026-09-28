import { describe, expect, it } from 'vitest';
import { createWorkspaceInputSchema } from './workspace';

describe('createWorkspaceInputSchema', () => {
  it('accepts a valid workspace and trims fields', () => {
    const result = createWorkspaceInputSchema.parse({
      name: '  Spice Garden ',
      industry: 'Restaurant',
      industryCategory: 'food_hospitality',
      region: 'Pune',
    });
    expect(result).toEqual({
      name: 'Spice Garden',
      industry: 'Restaurant',
      industryCategory: 'food_hospitality',
      region: 'Pune',
    });
  });

  it('turns an empty region into undefined', () => {
    const result = createWorkspaceInputSchema.parse({
      name: 'Acme',
      industry: 'B2B SaaS',
      industryCategory: 'software',
      region: '',
    });
    expect(result.region).toBeUndefined();
  });

  it('rejects an unknown industry category', () => {
    const result = createWorkspaceInputSchema.safeParse({
      name: 'Acme',
      industry: 'B2B SaaS',
      industryCategory: 'spaceships',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a too-short name', () => {
    const result = createWorkspaceInputSchema.safeParse({
      name: 'A',
      industry: 'B2B SaaS',
      industryCategory: 'software',
    });
    expect(result.success).toBe(false);
  });
});
