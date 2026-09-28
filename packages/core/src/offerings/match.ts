// Offering mapping, tier 1: alias match (SYSTEM_DESIGN §6). Tier 2 (pgvector similarity) is
// deferred - see D-004 - so tier 2 here is the LLM match, done by the caller with the
// candidates this module picks out; tier 3 is "create new".
//
// Takes a minimal structural shape rather than the full domain `Offering` (which has fields
// this logic doesn't need) or `@cip/db`'s row type (which this package never imports) - either
// one satisfies this shape, so callers on both sides pass their own type through unchanged.
export type MatchableOffering = { id: string; name: string; aliases: string[] };

export function normalizeOfferingText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // can introduce new leading/trailing whitespace (e.g. "combos!")
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/s$/, ''); // crude singularize - good enough for "combos" -> "combo" style aliases
}

// Exact match against an offering's name or any of its aliases, after normalization.
export function findAliasMatch(
  mentionText: string,
  offerings: MatchableOffering[],
): MatchableOffering | undefined {
  const normalizedMention = normalizeOfferingText(mentionText);
  return offerings.find((o) => {
    if (normalizeOfferingText(o.name) === normalizedMention) return true;
    return o.aliases.some((alias) => normalizeOfferingText(alias) === normalizedMention);
  });
}

// Word-overlap similarity (Jaccard over normalized tokens) - a lightweight, embedding-free
// stand-in for the pgvector pre-filter (D-004) that narrows a large offering list down to a
// few real candidates before spending an LLM call on the ambiguous cases.
function jaccard(a: string, b: string): number {
  const setA = new Set(normalizeOfferingText(a).split(' ').filter(Boolean));
  const setB = new Set(normalizeOfferingText(b).split(' ').filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

export type OfferingCandidate = { offering: MatchableOffering; score: number };

// Top-N candidates by word overlap with the mention text or any of the offering's aliases,
// above a minimum similarity - the shortlist an LLM match call gets to choose from, instead of
// every offering in the workspace.
export function rankOfferingCandidates(
  mentionText: string,
  offerings: MatchableOffering[],
  { topN = 5, minScore = 0.15 }: { topN?: number; minScore?: number } = {},
): OfferingCandidate[] {
  return offerings
    .map((offering) => {
      const nameScore = jaccard(mentionText, offering.name);
      const aliasScore = Math.max(0, ...offering.aliases.map((a) => jaccard(mentionText, a)));
      return { offering, score: Math.max(nameScore, aliasScore) };
    })
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
