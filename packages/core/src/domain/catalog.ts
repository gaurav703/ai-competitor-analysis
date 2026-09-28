import { z } from 'zod';

// Offering (spec §4): the central abstraction. Anything a business provides that can be
// compared - a feature, product, menu item, plan, delivery option, certification, and so on.
// This one concept is what lets the platform work across every industry.
export const offeringSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  // Free text, e.g. "Fulfilment", "Customer support", "Product line". Not a fixed enum:
  // categories vary too much by industry to close the list.
  category: z.string().trim().min(1).max(100),
  aliases: z.array(z.string().trim().min(1)).default([]),
});
export type Offering = z.infer<typeof offeringSchema>;

// PriceEntry (spec §4). Currency and unit are stored explicitly (§9 "price comparison" hard
// problem) so amounts are never compared across mismatched units or currencies.
export const priceEntrySchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  offeringId: z.uuid().optional(),
  subjectType: z.enum(['self', 'competitor']),
  subjectId: z.uuid().optional(), // required when subjectType = 'competitor'
  label: z.string().trim().min(1).max(200),
  amount: z.number().nonnegative(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase()), // ISO 4217, e.g. "INR", "USD"
  unit: z.string().trim().max(50).optional(), // e.g. "per month", "per plate", "per sqft"
  observedAt: z.date(),
  sourceId: z.uuid().optional(),
});
export type PriceEntry = z.infer<typeof priceEntrySchema>;
