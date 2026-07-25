/**
 * A story is marked done by prefixing the text with `~`.
 * e.g. "~Search by keyword" means done.
 *
 * The ~ is stripped from the display text but preserved in storage.
 */

export function isStoryDone(rawText: string): boolean {
  return rawText.trimStart().startsWith('~');
}

export function toggleStoryDone(rawText: string): string {
  const trimmed = rawText.trimStart();
  const leading = rawText.slice(0, rawText.length - trimmed.length);
  if (trimmed.startsWith('~')) {
    return leading + trimmed.slice(1).trimStart();
  }
  return leading + '~' + trimmed;
}

export function storyDisplayText(rawText: string): string {
  const trimmed = rawText.trimStart();
  if (trimmed.startsWith('~')) return trimmed.slice(1).trimStart();
  return rawText;
}
