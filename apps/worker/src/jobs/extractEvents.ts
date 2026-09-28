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
} from '@cip/prompts';
import type { Logger } from 'pino';
import { getAdapter } from '../adapters';
import { lineDiff } from '../adapters/diff';
import { mapOfferingMention } from './mapOffering';
import type { ProcessEventJobData } from '../queues/names';

export type ExtractEventsDeps = {
  db: Database;
  llmDeps: LlmDeps;
  logger: Logger;
  enqueueProcessEvent: (data: ProcessEventJobData) => Promise<void>;
};

// extract-events (SYSTEM_DESIGN §4.1/§4.3): Snapshot + previous -> diff -> LLM extract -> Zod
// validate -> map offerings -> candidate events, handed to process-event (F5) for dedup,
// importance and storage.
export async function runExtractEvents(
  deps: ExtractEventsDeps,
  sourceId: string,
  snapshotId: string,
): Promise<{ extracted: number }> {
  const { db, llmDeps, logger, enqueueProcessEvent } = deps;

  const source = await getSource(db, sourceId);
  const snapshot = await getSnapshot(db, snapshotId);
  if (!source || !snapshot) {
    logger.error({ sourceId, snapshotId }, 'extract-events: source or snapshot not found');
    return { extracted: 0 };
  }

  // Self-monitoring sources feed the user's own profile/metrics directly (a later phase),
  // not competitor Events - Event.competitorId is required, so there's nothing to extract into.
  if (source.subjectType !== 'competitor' || !source.subjectId) {
    return { extracted: 0 };
  }

  const competitor = await getCompetitor(db, source.workspaceId, source.subjectId);
  if (!competitor) {
    logger.error({ sourceId }, 'extract-events: competitor not found for source');
    return { extracted: 0 };
  }
  const workspace = await getWorkspace(db, source.workspaceId);
  if (!workspace) {
    logger.error({ sourceId }, 'extract-events: workspace not found for source');
    return { extracted: 0 };
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

  if (!result) return { extracted: 0 };

  for (const event of result.events) {
    const mapped = await Promise.all(
      event.offeringMentions.map((mention) =>
        mapOfferingMention(db, llmDeps, source.workspaceId, 'General', mention),
      ),
    );

    const candidate = {
      ...event,
      sourceIds: [sourceId],
      snapshotIds: [snapshotId],
      offeringsAffected: mapped.map((m) => ({ id: m.offering.id, name: m.offering.name })),
    };

    await enqueueProcessEvent({
      workspaceId: source.workspaceId,
      competitorId: competitor.id,
      candidate,
    });
  }

  return { extracted: result.events.length };
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
