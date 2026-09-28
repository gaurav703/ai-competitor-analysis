import { describe, expect, it } from 'vitest';
import { buildDedupKey, isLikelyDuplicate, textSimilarity } from './dedup';

describe('buildDedupKey', () => {
  it('is the same for the same competitor/type/subject within one time window', () => {
    const base = { competitorId: 'c1', type: 'pricing_change' as const, subject: 'Standard plan' };
    const a = buildDedupKey({ ...base, occurredAt: new Date('2026-01-01T00:00:00Z') });
    const b = buildDedupKey({ ...base, occurredAt: new Date('2026-01-01T12:00:00Z') });
    expect(a).toBe(b);
  });

  it('is stable across casing/punctuation differences in the subject', () => {
    const occurredAt = new Date('2026-01-01T00:00:00Z');
    const a = buildDedupKey({
      competitorId: 'c1',
      type: 'pricing_change',
      subject: 'Standard Plan!',
      occurredAt,
    });
    const b = buildDedupKey({
      competitorId: 'c1',
      type: 'pricing_change',
      subject: 'standard plan',
      occurredAt,
    });
    expect(a).toBe(b);
  });

  it('differs across competitors, types or far-apart times', () => {
    const occurredAt = new Date('2026-01-01T00:00:00Z');
    const base = {
      competitorId: 'c1',
      type: 'pricing_change' as const,
      subject: 'Standard plan',
      occurredAt,
    };
    expect(buildDedupKey(base)).not.toBe(buildDedupKey({ ...base, competitorId: 'c2' }));
    expect(buildDedupKey(base)).not.toBe(buildDedupKey({ ...base, type: 'promotion' }));
    expect(buildDedupKey(base)).not.toBe(
      buildDedupKey({ ...base, occurredAt: new Date('2026-03-01T00:00:00Z') }),
    );
  });
});

describe('textSimilarity / isLikelyDuplicate', () => {
  // Realistic case: two sources (e.g. the pricing page vs. a news writeup) reporting the same
  // fact in their own words - most content words overlap, phrasing doesn't match exactly.
  const eventA = {
    title: 'Standard plan price raised to $29 per month',
    summary: 'Standard plan now $29 per month, up from $19',
  };
  const eventB = {
    title: 'Acme raises Standard plan price to $29/month',
    summary: 'The Standard plan price increased from $19 to $29 per month',
  };
  const eventC = {
    title: 'New WhatsApp support channel launched',
    summary: 'Customers can now reach support via WhatsApp',
  };

  it('scores near-duplicate text higher than unrelated text', () => {
    expect(textSimilarity(eventA, eventB)).toBeGreaterThan(textSimilarity(eventA, eventC));
  });

  it('flags same competitor/type + similar text as a likely duplicate', () => {
    const a = { competitorId: 'c1', type: 'pricing_change' as const, ...eventA };
    const b = { competitorId: 'c1', type: 'pricing_change' as const, ...eventB };
    expect(isLikelyDuplicate(a, b)).toBe(true);
  });

  it('never flags a duplicate across different competitors or event types', () => {
    const a = { competitorId: 'c1', type: 'pricing_change' as const, ...eventA };
    const differentCompetitor = { competitorId: 'c2', type: 'pricing_change' as const, ...eventB };
    const differentType = { competitorId: 'c1', type: 'promotion' as const, ...eventB };
    expect(isLikelyDuplicate(a, differentCompetitor)).toBe(false);
    expect(isLikelyDuplicate(a, differentType)).toBe(false);
  });
});
