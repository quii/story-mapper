import { describe, it, expect } from 'vitest';
import { allTasks, totalRows, storyAtRow, releaseAfterRow, storyFlatIndex } from '../../core/layout';
import type { Activity, Release, Task } from '../../core/types';

function makeTask(stories: string[]): Task {
  return {
    id: 't1',
    name: 'Task',
    stories: stories.map((text, i) => ({ id: String(i), type: 'story' as const, text })),
  };
}

function makeActivity(tasks: Task[]): Activity {
  return { id: 'a1', name: 'Act', tasks };
}

function makeRelease(tier: number, name = 'R'): Release {
  return { id: `r${tier}`, name, tier };
}

describe('layout', () => {
  describe('allTasks', () => {
    it('returns tasks from all activities', () => {
      const acts = [makeActivity([makeTask(['S'])]), makeActivity([makeTask(['S2'])])];
      expect(allTasks(acts)).toHaveLength(2);
    });

    it('injects phantom task for activity with no tasks', () => {
      const flat = allTasks([makeActivity([])]);
      expect(flat).toHaveLength(1);
      expect(flat[0].task.stories).toHaveLength(0);
    });
  });

  describe('totalRows', () => {
    it('returns story count when no releases', () => {
      const acts = [makeActivity([makeTask(['S1', 'S2', 'S3'])])];
      expect(totalRows(acts, [])).toBe(3);
    });

    it('returns at least 1 for empty map', () => {
      expect(totalRows([], [])).toBe(1);
    });

    it('extends rows to cover release tier even if no stories that far', () => {
      const acts = [makeActivity([makeTask(['S1'])])];
      expect(totalRows(acts, [makeRelease(3)])).toBe(3);
    });

    it('uses max of stories and release tier', () => {
      const acts = [makeActivity([makeTask(['S1', 'S2', 'S3', 'S4', 'S5'])])];
      expect(totalRows(acts, [makeRelease(2)])).toBe(5);
    });
  });

  describe('storyAtRow', () => {
    it('returns story at row', () => {
      const task = makeTask(['A', 'B', 'C']);
      expect(storyAtRow(task, 0)?.text).toBe('A');
      expect(storyAtRow(task, 2)?.text).toBe('C');
    });

    it('returns undefined for out-of-range row', () => {
      const task = makeTask(['A']);
      expect(storyAtRow(task, 5)).toBeUndefined();
    });
  });

  describe('releaseAfterRow', () => {
    it('finds release after the correct row (0-based)', () => {
      // release @ 1 means after row 0 (0-based)
      const releases = [makeRelease(1, 'MVP')];
      expect(releaseAfterRow(releases, 0)?.name).toBe('MVP');
      expect(releaseAfterRow(releases, 1)).toBeUndefined();
    });

    it('finds release @ 3 after row 2', () => {
      const releases = [makeRelease(3, 'Beta')];
      expect(releaseAfterRow(releases, 2)?.name).toBe('Beta');
      expect(releaseAfterRow(releases, 1)).toBeUndefined();
    });
  });

  describe('storyFlatIndex', () => {
    it('returns the row number as the flat index', () => {
      const task = makeTask(['A', 'B', 'C']);
      expect(storyFlatIndex(task, 0)).toBe(0);
      expect(storyFlatIndex(task, 2)).toBe(2);
    });

    it('returns -1 for out-of-range', () => {
      const task = makeTask(['A']);
      expect(storyFlatIndex(task, 5)).toBe(-1);
    });
  });
});
