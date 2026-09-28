import type { ContentDiff, NormalizedContent } from './types';

// Default diff: line-level set difference (SYSTEM_DESIGN §11: "default: text/line diff").
// Order doesn't matter for what gets sent to the LLM - only which lines are new/gone.
export function lineDiff(prev: NormalizedContent, next: NormalizedContent): ContentDiff {
  const prevLines = new Set(prev.text.split('\n'));
  const nextLines = new Set(next.text.split('\n'));

  const addedLines = [...nextLines].filter((l) => !prevLines.has(l));
  const removedLines = [...prevLines].filter((l) => !nextLines.has(l));

  return {
    hasChange: addedLines.length > 0 || removedLines.length > 0,
    addedLines,
    removedLines,
  };
}
