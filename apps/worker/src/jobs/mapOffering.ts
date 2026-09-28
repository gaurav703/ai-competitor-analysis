import { findAliasMatch, rankOfferingCandidates } from '@cip/core';
import type { Database, Offering } from '@cip/db';
import { addOfferingAlias, createOffering, listOfferings } from '@cip/db';
import type { LlmDeps } from '@cip/prompts';
import {
  buildMapOfferingPrompt,
  callLlmStructured,
  MAP_OFFERING_PROMPT_VERSION,
  mapOfferingResultSchema,
} from '@cip/prompts';

export type MapOfferingResult = { offering: Offering; created: boolean };

// Offering mapping (SYSTEM_DESIGN §6): alias match -> LLM match against a shortlist -> create
// new. The pgvector similarity tier is deferred (D-004); `rankOfferingCandidates` (word-overlap
// scoring, packages/core) stands in for it as the pre-filter that keeps the LLM's candidate
// list small.
export async function mapOfferingMention(
  db: Database,
  llmDeps: LlmDeps,
  workspaceId: string,
  category: string,
  mentionText: string,
): Promise<MapOfferingResult> {
  const existing = await listOfferings(db, workspaceId);

  const aliasMatch = findAliasMatch(mentionText, existing);
  if (aliasMatch) {
    const full = existing.find((o) => o.id === aliasMatch.id);
    if (full) return { offering: full, created: false };
  }

  const candidates = rankOfferingCandidates(mentionText, existing);
  if (candidates.length > 0) {
    const { systemPrompt, userPrompt } = buildMapOfferingPrompt(
      mentionText,
      candidates.map((c) => ({
        id: c.offering.id,
        name: c.offering.name,
        aliases: c.offering.aliases,
      })),
    );
    const result = await callLlmStructured(llmDeps, {
      task: 'mapOffering',
      promptVersion: MAP_OFFERING_PROMPT_VERSION,
      systemPrompt,
      userPrompt,
      schema: mapOfferingResultSchema,
      loggedInput: { workspaceId, mentionText, candidateIds: candidates.map((c) => c.offering.id) },
    });

    if (result?.matchId) {
      const matched = existing.find((o) => o.id === result.matchId);
      if (matched) {
        await addOfferingAlias(db, matched.id, mentionText);
        return { offering: matched, created: false };
      }
    }
  }

  const created = await createOffering(db, { workspaceId, name: mentionText, category });
  return { offering: created, created: true };
}
