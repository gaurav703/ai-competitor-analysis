import { z } from 'zod';
import { EVENT_TYPES } from '@cip/core';

export const EXTRACT_EVENTS_PROMPT_VERSION = 'extractEvents.v1';

// What the LLM returns per event - a subset of the full Event (spec §4): ids, sourceIds,
// dedupKey and importance are all filled in by code after this step, never by the model.
export const extractedEventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().min(1).max(2000),
  structured: z.record(z.string(), z.unknown()).default({}),
  // Free-text mentions of things the business offers/sells - mapped to canonical Offerings by
  // packages/core's offering-matching pipeline, not by this prompt.
  offeringMentions: z.array(z.string().trim().min(1)).default([]),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
});
export type ExtractedEvent = z.infer<typeof extractedEventSchema>;

export const extractedEventsSchema = z.object({ events: z.array(extractedEventSchema) });
export type ExtractedEvents = z.infer<typeof extractedEventsSchema>;

export type ExtractEventsInput =
  | { kind: 'diff'; addedLines: string[]; removedLines: string[] }
  | { kind: 'new_item'; content: string };

const SYSTEM_PROMPT = `You are a competitive-intelligence analyst. You read a change to a competitor's public content and extract the real-world business events it represents.

Rules:
- Only report events actually supported by the given text. Never invent details.
- One piece of text can contain zero, one, or several distinct events.
- Prefer few precise events over many speculative ones - when unsure whether something is a real event, omit it.
- "structured" holds type-specific facts you can point to in the text: for pricing_change use {item, oldPrice, newPrice, currency}; for new_offering/offering_removed/offering_updated use {item}; for partnership use {partner}; for expansion use {location}; for hiring use {roles, count}; for app_release use {version}; otherwise include whatever concrete facts are stated.
- "offeringMentions" lists the plain-language names of products/services/plans/features mentioned, exactly as written in the text - not normalized or invented.
- Respond with ONLY a JSON object of the shape {"events": [...]}, no prose, no markdown fence.`;

export function buildExtractEventsPrompt(
  input: ExtractEventsInput,
  context: { industry: string; competitorName: string },
): { systemPrompt: string; userPrompt: string } {
  const body =
    input.kind === 'diff'
      ? [
          input.addedLines.length > 0 ? `Added lines:\n${input.addedLines.join('\n')}` : '',
          input.removedLines.length > 0 ? `Removed lines:\n${input.removedLines.join('\n')}` : '',
        ]
          .filter(Boolean)
          .join('\n\n')
      : `New content:\n${input.content}`;

  const userPrompt = `Competitor: ${context.competitorName}
Industry: ${context.industry}

${body}

Extract the events as a JSON object: {"events": [...]}. If there are no real events here, return {"events": []}.`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
