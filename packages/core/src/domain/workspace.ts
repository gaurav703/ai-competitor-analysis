import { z } from 'zod';
import { INDUSTRY_CATEGORIES } from '../config/industries';

export const createWorkspaceInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  industry: z.string().trim().min(2, 'Describe your industry').max(100),
  industryCategory: z.enum(INDUSTRY_CATEGORIES),
  region: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;
