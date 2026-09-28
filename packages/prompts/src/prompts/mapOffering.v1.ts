import { z } from 'zod';

export const MAP_OFFERING_PROMPT_VERSION = 'mapOffering.v1';

export const mapOfferingResultSchema = z.object({
  matchId: z.uuid().nullable(), // null = none of the candidates are the same thing
});
export type MapOfferingResult = z.infer<typeof mapOfferingResultSchema>;

const SYSTEM_PROMPT = `You decide whether a newly mentioned product/service/feature is the same thing as one already in a business's offering list, or something new.

Rules:
- Match only if it's genuinely the same offering described differently (e.g. "same-day delivery" and "express dispatch" can be the same thing; "delivery" and "in-store pickup" are not).
- If you're not confident, say no match - a wrong match creates a wrong comparison later, which is worse than creating one duplicate entry.
- Respond with ONLY a JSON object {"matchId": "<uuid>"} or {"matchId": null}, no prose.`;

export function buildMapOfferingPrompt(
  mentionText: string,
  candidates: { id: string; name: string; aliases: string[] }[],
): { systemPrompt: string; userPrompt: string } {
  const candidateList = candidates
    .map(
      (c) =>
        `- id: ${c.id}, name: "${c.name}"${c.aliases.length > 0 ? `, also known as: ${c.aliases.map((a) => `"${a}"`).join(', ')}` : ''}`,
    )
    .join('\n');

  const userPrompt = `New mention: "${mentionText}"

Existing offerings:
${candidateList}

Is the new mention the same as one of these? Answer as {"matchId": "<id>"} or {"matchId": null}.`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
