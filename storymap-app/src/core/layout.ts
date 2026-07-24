import type { Activity, Release, StoryItem, Task } from './types';

/** Flattened task list, injecting a phantom task for activities with no tasks */
export function allTasks(activities: Activity[]): { task: Task; actIdx: number; taskIdx: number }[] {
  const result: { task: Task; actIdx: number; taskIdx: number }[] = [];
  activities.forEach((act, ai) => {
    if (act.tasks.length === 0) {
      result.push({ task: { id: `phantom-${ai}`, name: '', stories: [] }, actIdx: ai, taskIdx: 0 });
    } else {
      act.tasks.forEach((task, ti) => {
        result.push({ task, actIdx: ai, taskIdx: ti });
      });
    }
  });
  return result;
}

/**
 * Total number of story rows to display.
 *
 * `release.tier` is the 1-indexed absolute row number after which the band appears.
 * The total rows = max(stories across all tasks, highest release tier, 1).
 */
export function totalRows(activities: Activity[], releases: Release[]): number {
  const allTaskList = allTasks(activities).map((e) => e.task);
  const maxStories = Math.max(0, ...allTaskList.map((t) => t.stories.length));
  const maxReleaseTier = releases.length > 0 ? Math.max(...releases.map((r) => r.tier)) : 0;
  return Math.max(maxStories, maxReleaseTier, 1);
}

/**
 * For a given absolute row index (0-based), get the story for a task at that row.
 * Simply indexes into task.stories — stories fill rows from the top.
 */
export function storyAtRow(task: Task, row: number): StoryItem | undefined {
  return task.stories[row];
}

/**
 * The release band (if any) that appears AFTER the given 0-based row index.
 * A release with tier N appears after row N-1 (0-based), i.e. after the Nth row.
 */
export function releaseAfterRow(releases: Release[], row: number): Release | undefined {
  // row is 0-based; release.tier is 1-based, so release after row R is tier R+1
  return releases.find((r) => r.tier === row + 1);
}

/**
 * The flat story index for (row) within a task — just the row number itself,
 * since stories are stored flat.
 */
export function storyFlatIndex(task: Task, row: number): number {
  if (row < 0 || row >= task.stories.length) return -1;
  return row;
}

/** Stories belonging to rows in a given range [fromRow, toRow) */
export function getStoriesInRange(task: Task, fromRow: number, toRow: number): StoryItem[] {
  return task.stories.slice(fromRow, toRow);
}
