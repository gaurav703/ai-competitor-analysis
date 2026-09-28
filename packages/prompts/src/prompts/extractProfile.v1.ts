import { z } from 'zod';

export const EXTRACT_PROFILE_PROMPT_VERSION = 'extractProfile.v1';

// Draft business profile (spec §5 F1): "auto-extracted, then the user reviews and edits it".
// Offerings/pricing here are plain text, not yet canonical Offering/PriceEntry rows - creating
// those (with real ids) happens after the user confirms the draft.
export const businessProfileDraftSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  offerings: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        category: z.string().trim().min(1).max(100),
      }),
    )
    .default([]),
  pricing: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        amount: z.number().nonnegative(),
        currency: z.string().trim().length(3),
        unit: z.string().trim().max(50).optional(),
      }),
    )
    .default([]),
  // Models sometimes return "" instead of omitting an unstated field - normalize to undefined
  // so downstream code has one way to check "not stated", not two.
  targetCustomers: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type BusinessProfileDraft = z.infer<typeof businessProfileDraftSchema>;

const SYSTEM_PROMPT = `You are helping a business owner set up a competitive intelligence tool. Read their own website text and/or description and extract a factual profile of their business.

Rules:
- Only include what the text actually states. Never invent products, prices or customers.
- "offerings" are the concrete things they sell or provide - products, services, plans, menu items, features - each with a short category label (e.g. "Menu", "Plans", "Integrations").
- "pricing" only for prices actually stated in the text, with the currency as it appears (assume the most likely ISO code if a symbol is used, e.g. "$" -> "USD", "₹" -> "INR").
- If nothing is stated for a field, leave its array empty or the field absent - never guess.
- Respond with ONLY a JSON object matching the schema, no prose, no markdown fence.`;

export function buildExtractProfilePrompt(input: {
  industry: string;
  userDescription: string;
  websiteText?: string;
}): { systemPrompt: string; userPrompt: string } {
  const userPrompt = `Industry: ${input.industry}

Business owner's own description:
${input.userDescription}
${input.websiteText ? `\nText from their website homepage:\n${input.websiteText.slice(0, 6000)}` : ''}

Extract the business profile as JSON: {"description": "...", "offerings": [{"name": "...", "category": "..."}], "pricing": [{"label": "...", "amount": 0, "currency": "...", "unit": "..."}], "targetCustomers": "..."}.`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
