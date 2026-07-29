import type { Activity, Release, StoryItem, Task } from './types';

export function allTasks(activities: Activity[]): { task: Task; actIdx: number; taskIdx: number }[] {
  const result: { task: Task; actIdx: number; taskIdx: number }[] = [];
  activities.forEach((act, ai) => {
    if (act.tasks.length === 0) {
      result.push({ task: { id: `phantom-${ai}`, name: '', items: [] }, actIdx: ai, taskIdx: 0 });
    } else {
      act.tasks.forEach((task, ti) => result.push({ task, actIdx: ai, taskIdx: ti }));
    }
  });
  return result;
}

/**
 * Split a task's items into per-row buckets: each item is its own row, in order.
 * A TierSeparator produces an empty row — it doesn't hold a story itself, it just
 * pushes every later item in this task's column down to the next raw row (and
 * potentially past a release line, into a later release).
 * Returns tiers[0], tiers[1], ... where tiers[i] corresponds to raw items-array index i.
 */
export function splitTiers(task: Task): StoryItem[][] {
  return task.items.map(item => (item.type === 'story' ? [item] : []));
}

/** Longest task's raw item count (stories + separators), ignoring releases. */
function rawRowCount(activities: Activity[]): number {
  let max = 0;
  for (const act of activities)
    for (const task of act.tasks)
      if (task.items.length > max) max = task.items.length;
  return max;
}

/**
 * Maps each *visible* row (0-based; what `release.tier` counts, 1-based) to the
 * underlying raw items-array index shared by every task. A raw row only counts as
 * visible if some task has a real story there — an all-separator row (every task
 * skips it) is invisible and doesn't consume a row number. Releases declared
 * further out than any current content extend past the end, one raw row apiece.
 */
export function tierRawIndices(activities: Activity[], releases: Release[]): number[] {
  const total = rawRowCount(activities);
  const visible: number[] = [];
  for (let r = 0; r < total; r++) {
    if (activities.some(act => act.tasks.some(t => t.items[r]?.type === 'story'))) visible.push(r);
  }
  const maxRelTier = releases.length > 0 ? Math.max(...releases.map(r => r.tier)) : 0;
  const numTiers = Math.max(visible.length, maxRelTier, 1);
  return Array.from({ length: numTiers }, (_, t) => (t < visible.length ? visible[t] : total + (t - visible.length)));
}

/** Number of visible rows = the count of rows with real content, or the highest release row, whichever is larger. */
export function tierCount(activities: Activity[], releases: Release[]): number {
  return tierRawIndices(activities, releases).length;
}

/** For each visible row, whether any task has a real story there (always 0 or 1). */
export function tierMaxRows(activities: Activity[], releases: Release[]): number[] {
  const rawIndices = tierRawIndices(activities, releases);
  return rawIndices.map(raw => {
    for (const act of activities)
      for (const task of act.tasks)
        if (task.items[raw]?.type === 'story') return 1;
    return 0;
  });
}

/**
 * Flat index of the story at (rawIndex, slot) within a task's items array — rawIndex === index,
 * since each row is one item. Callers working in visible/compact tiers must translate through
 * `tierRawIndices` first; this operates on the raw items-array position directly.
 */
export function storyFlatIndex(task: Task, rawIndex: number, slot: number): number {
  if (slot !== 0) return -1;
  const item = task.items[rawIndex];
  return item && item.type === 'story' ? rawIndex : -1;
}

/** Stories at a given raw items-array index for a task (see `storyFlatIndex`). */
export function getStoriesForTier(task: Task, rawIndex: number): StoryItem[] {
  return splitTiers(task)[rawIndex] ?? [];
}

/** Total number of display rows = sum of tierMaxRows. */
export function totalDisplayRows(activities: Activity[], releases: Release[]): number {
  return tierMaxRows(activities, releases).reduce((a, b) => a + b, 0);
}

/** Release band after a given visible/compact tier (0-based; release.tier is the matching 1-based row). */
export function releaseForTier(releases: Release[], tier: number): Release | undefined {
  return releases.find(r => r.tier === tier + 1);
}
