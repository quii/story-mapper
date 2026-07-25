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
 * Split a task's items into per-tier story buckets.
 * Each TierSeparator starts a new bucket.
 * Returns tiers[0], tiers[1], ...
 */
export function splitTiers(task: Task): StoryItem[][] {
  const tiers: StoryItem[][] = [[]];
  for (const item of task.items) {
    if (item.type === 'separator') tiers.push([]);
    else tiers[tiers.length - 1].push(item);
  }
  return tiers;
}

/** Number of tiers = max separator count across all tasks + 1, or max release tier, whichever is larger. */
export function tierCount(activities: Activity[], releases: Release[]): number {
  let maxSeps = 0;
  for (const act of activities)
    for (const task of act.tasks) {
      const seps = task.items.filter(i => i.type === 'separator').length;
      if (seps > maxSeps) maxSeps = seps;
    }
  const maxRelTier = releases.length > 0 ? Math.max(...releases.map(r => r.tier)) : 0;
  return Math.max(maxSeps, maxRelTier) + 1;
}

/** For each tier index, the max number of stories any single task has in that tier. */
export function tierMaxRows(activities: Activity[], releases: Release[]): number[] {
  const numTiers = tierCount(activities, releases);
  const maxRows = Array(numTiers).fill(0);
  for (const { task } of allTasks(activities)) {
    const tiers = splitTiers(task);
    for (let t = 0; t < numTiers; t++) {
      const count = tiers[t]?.length ?? 0;
      if (count > maxRows[t]) maxRows[t] = count;
    }
  }
  return maxRows;
}

/** Flat index of the story at (tier, slot) within a task's items array. */
export function storyFlatIndex(task: Task, tier: number, slot: number): number {
  let t = 0;
  let s = 0;
  for (let i = 0; i < task.items.length; i++) {
    const item = task.items[i];
    if (item.type === 'separator') { t++; s = 0; }
    else {
      if (t === tier && s === slot) return i;
      s++;
    }
  }
  return -1;
}

/** Index at which to insert a new story at the end of the given tier. */
export function tierInsertIndex(task: Task, tier: number): number {
  let t = 0;
  for (let i = 0; i < task.items.length; i++) {
    if (task.items[i].type === 'separator') {
      if (t === tier) return i;
      t++;
    }
  }
  return task.items.length;
}

/** Index of the Nth separator (0-based). Returns -1 if not found. */
export function separatorIndex(task: Task, tier: number): number {
  let count = 0;
  for (let i = 0; i < task.items.length; i++) {
    if (task.items[i].type === 'separator') {
      if (count === tier) return i;
      count++;
    }
  }
  return -1;
}

/** Stories in a given tier for a task. */
export function getStoriesForTier(task: Task, tier: number): StoryItem[] {
  return splitTiers(task)[tier] ?? [];
}

/** Total number of display rows = sum of tierMaxRows. */
export function totalDisplayRows(activities: Activity[], releases: Release[]): number {
  return tierMaxRows(activities, releases).reduce((a, b) => a + b, 0);
}

/** Release band after a given tier (0-based tier index). */
export function releaseForTier(releases: Release[], tier: number): Release | undefined {
  // tier is 0-based; release.tier is 1-based separator index
  return releases.find(r => r.tier === tier + 1);
}
