import { describe, expect, it } from 'vitest';
import { findAliasMatch, normalizeOfferingText, rankOfferingCandidates } from './match';

const offerings = [
  { id: '1', name: 'Home delivery', aliases: ['express dispatch', 'doorstep delivery'] },
  { id: '2', name: 'WhatsApp support', aliases: [] },
  { id: '3', name: 'Lunch combo', aliases: ['lunch deal'] },
];

describe('normalizeOfferingText', () => {
  it('lowercases, strips punctuation and crude-singularizes', () => {
    expect(normalizeOfferingText('Lunch Combos!')).toBe('lunch combo');
    expect(normalizeOfferingText('  WhatsApp Support  ')).toBe('whatsapp support');
  });
});

describe('findAliasMatch', () => {
  it('matches on the offering name itself', () => {
    expect(findAliasMatch('WhatsApp Support', offerings)?.id).toBe('2');
  });

  it('matches on an alias, not just the primary name', () => {
    expect(findAliasMatch('express dispatch', offerings)?.id).toBe('1');
  });

  it('is case/whitespace insensitive', () => {
    expect(findAliasMatch('  LUNCH DEAL  ', offerings)?.id).toBe('3');
  });

  it('returns undefined when nothing matches', () => {
    expect(findAliasMatch('free returns', offerings)).toBeUndefined();
  });
});

describe('rankOfferingCandidates', () => {
  it('ranks by word overlap and excludes low-similarity offerings', () => {
    const candidates = rankOfferingCandidates('doorstep delivery service', offerings);
    expect(candidates[0]?.offering.id).toBe('1');
  });

  it('returns nothing when no offering shares any words', () => {
    expect(rankOfferingCandidates('quantum teleportation', offerings)).toEqual([]);
  });
});
