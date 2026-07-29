import { describe, it, expect } from 'vitest';
import { allTasks, tierCount, tierMaxRows, tierRawIndices, getStoriesForTier, storyFlatIndex, releaseForTier } from '../../core/layout';
import type { Activity, Release, Task } from '../../core/types';

function makeTask(items: ({ type: 'story'; text: string } | { type: 'separator' })[]): Task {
  return { id: 't1', name: 'Task', items: items.map((i, idx) => ({ ...i, id: String(idx) })) };
}
function makeActivity(tasks: Task[]): Activity { return { id: 'a1', name: 'Act', tasks }; }
function makeRelease(tier: number, name = 'R'): Release { return { id: `r${tier}`, name, tier }; }

describe('layout', () => {
  describe('allTasks', () => {
    it('returns tasks from all activities', () => {
      const acts = [makeActivity([makeTask([{ type: 'story', text: 'S' }])]), makeActivity([makeTask([{ type: 'story', text: 'S2' }])])];
      expect(allTasks(acts)).toHaveLength(2);
    });
    it('injects phantom task for activity with no tasks', () => {
      const flat = allTasks([makeActivity([])]);
      expect(flat).toHaveLength(1);
      expect(flat[0].task.items).toHaveLength(0);
    });
  });

  describe('tierRawIndices', () => {
    it('maps visible rows straight through when nothing is collapsed', () => {
      const task = makeTask([{ type: 'story', text: 'A' }, { type: 'story', text: 'B' }, { type: 'story', text: 'C' }]);
      expect(tierRawIndices([makeActivity([task])], [])).toEqual([0, 1, 2]);
    });
    it('collapses a row that is a separator for every task', () => {
      const t1 = makeTask([{ type: 'story', text: 'A' }, { type: 'separator' }, { type: 'story', text: 'B' }]);
      const t2 = makeTask([{ type: 'story', text: 'C' }, { type: 'separator' }, { type: 'story', text: 'D' }]);
      expect(tierRawIndices([makeActivity([t1, t2])], [])).toEqual([0, 2]);
    });
    it('keeps a row visible if any task has a real story there', () => {
      const t1 = makeTask([{ type: 'story', text: 'A' }, { type: 'separator' }, { type: 'story', text: 'B' }]);
      const t2 = makeTask([{ type: 'story', text: 'C' }, { type: 'story', text: 'D' }]);
      expect(tierRawIndices([makeActivity([t1, t2])], [])).toEqual([0, 1, 2]);
    });
    it('extends past the end, one raw row per extra release tier', () => {
      const task = makeTask([{ type: 'story', text: 'A' }]);
      expect(tierRawIndices([makeActivity([task])], [makeRelease(3)])).toEqual([0, 1, 2]);
    });
  });

  describe('tierCount', () => {
    it('returns 1 with no items and no releases', () => {
      expect(tierCount([makeActivity([makeTask([{ type: 'story', text: 'S' }])])], [])).toBe(1);
    });
    it('counts only rows with a real story, skipping an all-separator row', () => {
      const task = makeTask([{ type: 'story', text: 'S' }, { type: 'separator' }, { type: 'story', text: 'S2' }]);
      expect(tierCount([makeActivity([task])], [])).toBe(2);
    });
    it('uses release tier if higher than visible row count', () => {
      expect(tierCount([], [makeRelease(3)])).toBe(3);
    });
  });

  describe('tierMaxRows', () => {
    it('is 1 for every visible row (the all-separator row is collapsed away entirely)', () => {
      const task = makeTask([{ type: 'story', text: 'A' }, { type: 'story', text: 'B' }, { type: 'separator' }, { type: 'story', text: 'C' }]);
      const maxRows = tierMaxRows([makeActivity([task])], []);
      expect(maxRows).toEqual([1, 1, 1]);
    });
    it('is 0 for a reserved row beyond all current content', () => {
      const task = makeTask([{ type: 'story', text: 'A' }]);
      const maxRows = tierMaxRows([makeActivity([task])], [makeRelease(3)]);
      expect(maxRows).toEqual([1, 0, 0]);
    });
    it('takes max across tasks, per row', () => {
      const t1 = makeTask([{ type: 'story', text: 'A' }, { type: 'story', text: 'B' }]);
      const t2 = makeTask([{ type: 'story', text: 'C' }]);
      const maxRows = tierMaxRows([makeActivity([t1, t2])], []);
      expect(maxRows).toEqual([1, 1]);
    });
  });

  describe('storyFlatIndex', () => {
    it('returns index of story at row 0', () => {
      const task = makeTask([{ type: 'story', text: 'S' }]);
      expect(storyFlatIndex(task, 0, 0)).toBe(0);
    });
    it('returns index of story at a later row', () => {
      const task = makeTask([{ type: 'story', text: 'A' }, { type: 'story', text: 'B' }, { type: 'story', text: 'C' }]);
      expect(storyFlatIndex(task, 2, 0)).toBe(2);
    });
    it('returns -1 when the row holds a separator, not a story', () => {
      const task = makeTask([{ type: 'story', text: 'A' }, { type: 'separator' }, { type: 'story', text: 'C' }]);
      expect(storyFlatIndex(task, 1, 0)).toBe(-1);
    });
    it('returns -1 when out of range', () => {
      const task = makeTask([{ type: 'story', text: 'S' }]);
      expect(storyFlatIndex(task, 1, 0)).toBe(-1);
    });
  });

  describe('getStoriesForTier', () => {
    it('returns the single story at each row', () => {
      const task = makeTask([{ type: 'story', text: 'A' }, { type: 'story', text: 'B' }, { type: 'separator' }, { type: 'story', text: 'C' }]);
      expect(getStoriesForTier(task, 0).map(s => s.text)).toEqual(['A']);
      expect(getStoriesForTier(task, 1).map(s => s.text)).toEqual(['B']);
      expect(getStoriesForTier(task, 3).map(s => s.text)).toEqual(['C']);
    });
    it('returns empty for a separator row', () => {
      const task = makeTask([{ type: 'story', text: 'A' }, { type: 'separator' }, { type: 'story', text: 'B' }]);
      expect(getStoriesForTier(task, 1)).toHaveLength(0);
    });
    it('returns empty for a row past the end', () => {
      const task = makeTask([{ type: 'separator' }]);
      expect(getStoriesForTier(task, 5)).toHaveLength(0);
    });
  });

  describe('releaseForTier', () => {
    it('finds release for row 0 (release.tier === 1)', () => {
      expect(releaseForTier([makeRelease(1, 'MVP')], 0)?.name).toBe('MVP');
    });
    it('returns undefined when no release for that row', () => {
      expect(releaseForTier([makeRelease(2, 'Beta')], 0)).toBeUndefined();
    });
  });
});
