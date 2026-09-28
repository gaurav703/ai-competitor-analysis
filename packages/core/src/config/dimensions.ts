import type { Dimension, DimensionKey } from '../domain/metric';
import { dimensionSchema } from '../domain/metric';

// The 10 fixed dimensions (spec §2A) with default weights. Equal by default; a workspace can
// override via `workspaces.dimension_weights` (null = use these). Weights are re-normalized
// over available (non-null) dimensions when scoring (SYSTEM_DESIGN §7.2), so they don't need
// to sum to exactly 1 here - equal weighting is just the sanest MVP default.
export const DIMENSIONS: readonly Dimension[] = [
  { key: 'offerings', name: 'Offerings', defaultWeight: 0.1 },
  { key: 'pricing', name: 'Pricing & value', defaultWeight: 0.1 },
  { key: 'customer_experience', name: 'Customer experience', defaultWeight: 0.1 },
  { key: 'reputation', name: 'Reputation & reviews', defaultWeight: 0.1 },
  { key: 'digital_presence', name: 'Digital presence', defaultWeight: 0.1 },
  { key: 'marketing', name: 'Marketing & brand', defaultWeight: 0.1 },
  { key: 'channels', name: 'Sales channels & reach', defaultWeight: 0.1 },
  { key: 'innovation', name: 'Innovation speed', defaultWeight: 0.1 },
  { key: 'growth', name: 'Growth signals', defaultWeight: 0.1 },
  { key: 'trust', name: 'Trust & credentials', defaultWeight: 0.1 },
].map((d) => dimensionSchema.parse(d));

export const DEFAULT_DIMENSION_WEIGHTS: Record<DimensionKey, number> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d.defaultWeight]),
) as Record<DimensionKey, number>;

export function getDimension(key: DimensionKey): Dimension {
  const dim = DIMENSIONS.find((d) => d.key === key);
  if (!dim) throw new Error(`Unknown dimension: ${key}`); // unreachable: DimensionKey is exhaustive
  return dim;
}
