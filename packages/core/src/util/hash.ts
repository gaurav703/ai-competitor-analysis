import { createHash } from 'node:crypto';

// Stable content hash used throughout the pipeline: diff detection (Source.lastHash), LLM
// result caching (promptVersion + model + inputHash), and dedup keys.
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
