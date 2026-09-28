import { sha256Hex } from '@cip/core';
import type { Database } from '@cip/db';
import {
  getCompetitor,
  getPreviousSnapshot,
  getSnapshot,
  getSource,
  getWorkspace,
  llmCacheKey,
} from '@cip/db';
import type { LlmDeps } from '@cip/prompts';
import {
  buildExtractEventsPrompt,
  callLlmStructured,
  EXTRACT_EVENTS_PROMPT_VERSION,
  extractedEventsSchema,
  type ExtractedEvent,
} from '@cip/prompts';
import type { Logger } from 'pino';
import { getAdapter } from '../adapters';
import { lineDiff } from '../adapters/diff';
import { mapOfferingMention } from './mapOffering';

export type ExtractEventsDeps = {
  db: Database;
  llmDeps: LlmDeps;
  logger: Logger;
};

// A validated, offering-mapped event, ready for process-event (F5, Phase 5) to dedup, score
// and store. Phase 4 stops here: it doesn't write to the `events` table itself.
export type CandidateEvent = ExtractedEvent & {
  workspaceId: string;
  competitorId: string;
  sourceIds: string[];
  snapshotIds: string[];
  offeringsAffected: { id: string; name: string }[];
};

// extract-events (SYSTEM_DESIGN §4.1/§4.3): Snapshot + previous -> diff -> LLM extract -> Zod
// validate -> map offerings -> candidate events. Dedup, importance and storage are process-event
// (F5/F6), a later phase - this job's done-when (spec §5 F4) is "every event is a validated
// structured object linked to its sources [and offerings]", which candidates already satisfy.
export async function runExtractEvents(
  deps: ExtractEventsDeps,
  sourceId: string,
  snapshotId: string,
): Promise<CandidateEvent[]> {
  const { db, llmDeps, logger } = deps;

  const source = await getSource(db, sourceId);
  const snapshot = await getSnapshot(db, snapshotId);
  if (!source || !snapshot) {
    logger.error({ sourceId, snapshotId }, 'extract-events: source or snapshot not found');
    return [];
  }

  // Self-monitoring sources feed the user's own profile/metrics directly (a later phase),
  // not competitor Events - Event.competitorId is required, so there's nothing to extract into.
  if (source.subjectType !== 'competitor' || !source.subjectId) {
    return [];
  }

  const competitor = await getCompetitor(db, source.workspaceId, source.subjectId);
  if (!competitor) {
    logger.error({ sourceId }, 'extract-events: competitor not found for source');
    return [];
  }
  const workspace = await getWorkspace(db, source.workspaceId);
  if (!workspace) {
    logger.error({ sourceId }, 'extract-events: workspace not found for source');
    return [];
  }

  const isFeedType = Boolean(getAdapter(source.type).items);
  const input = isFeedType
    ? ({ kind: 'new_item', content: snapshot.content } as const)
    : await buildDiffInput(db, source.id, snapshot);

  const { systemPrompt, userPrompt } = buildExtractEventsPrompt(input, {
    industry: workspace.industry,
    competitorName: competitor.name,
  });

  const cacheKey = llmCacheKey(
    EXTRACT_EVENTS_PROMPT_VERSION,
    llmDeps.env.LLM_MODEL_MAIN,
    sha256Hex(userPrompt),
  );
  const result = await callLlmStructured(llmDeps, {
    task: 'extractEvents',
    promptVersion: EXTRACT_EVENTS_PROMPT_VERSION,
    systemPrompt,
    userPrompt,
    schema: extractedEventsSchema,
    cacheKey,
    loggedInput: { sourceId, snapshotId, workspaceId: source.workspaceId },
  });

  if (!result) return [];

  const candidates: CandidateEvent[] = [];
  for (const event of result.events) {
    const mapped = await Promise.all(
      event.offeringMentions.map((mention) =>
        mapOfferingMention(db, llmDeps, source.workspaceId, 'General', mention),
      ),
    );

    const candidate: CandidateEvent = {
      ...event,
      workspaceId: source.workspaceId,
      competitorId: competitor.id,
      sourceIds: [sourceId],
      snapshotIds: [snapshotId],
      offeringsAffected: mapped.map((m) => ({ id: m.offering.id, name: m.offering.name })),
    };
    candidates.push(candidate);
    logger.info(
      { sourceId, snapshotId, type: candidate.type, title: candidate.title },
      'candidate event extracted (process-event/Phase 5 not wired up yet - not stored)',
    );
  }

  return candidates;
}

async function buildDiffInput(
  db: Database,
  sourceId: string,
  snapshot: { content: string; fetchedAt: Date },
) {
  const previous = await getPreviousSnapshot(db, sourceId, snapshot.fetchedAt);
  if (!previous) return { kind: 'new_item', content: snapshot.content } as const;
  const diff = lineDiff({ text: previous.content }, { text: snapshot.content });
  return { kind: 'diff', addedLines: diff.addedLines, removedLines: diff.removedLines } as const;
}
