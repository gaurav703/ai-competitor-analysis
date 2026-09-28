import { z } from 'zod';
import { offeringRefSchema } from './shared';
import { priceEntrySchema } from './catalog';

// BusinessProfile (spec §4): the user's own business, auto-extracted (F1) then reviewed and
// edited. Stored as a JSONB column on `workspaces` (SYSTEM_DESIGN §5.2 flexible-payload rule),
// validated by this schema on every write.
export const businessProfileSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  offerings: z.array(offeringRefSchema).default([]),
  pricing: z.array(priceEntrySchema).default([]),
  targetCustomers: z.string().trim().max(500).optional(),
  locations: z.array(z.string().trim().min(1)).optional(),
  sourceUrls: z.array(z.url()).default([]),
});
export type BusinessProfile = z.infer<typeof businessProfileSchema>;
