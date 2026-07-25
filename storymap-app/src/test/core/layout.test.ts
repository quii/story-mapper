import { describe, it, expect } from 'vitest';
import { allTasks, tierCount, tierMaxRows, getStoriesForTier, storyFlatIndex, tierInsertIndex, releaseForTier } from '../../core/layout';
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

  describe('tierCount', () => {
    it('returns 1 with no separators and no releases', () => {
      expect(tierCount([makeActivity([makeTask([{ type: 'story', text: 'S' }])])], [])).toBe(1);
    });
    it('counts separators in tasks', () => {
      const task = makeTask([{ type: 'story', text: 'S' }, { type: 'separator' }, { type: 'story', text: 'S2' }]);
      expect(tierCount([makeActivity([task])], [])).toBe(2);
    });
    it('uses release tier if higher than separator count', () => {
      expect(tierCount([], [makeRelease(3)])).toBe(4);
    });
  });

  describe('tierMaxRows', () => {
    it('returns story count per tier', () => {
      const task = makeTask([{ type: 'story', text: 'A' }, { type: 'story', text: 'B' }, { type: 'separator' }, { type: 'story', text: 'C' }]);
      const maxRows = tierMaxRows([makeActivity([task])], [makeRelease(1)]);
      expect(maxRows[0]).toBe(2);
      expect(maxRows[1]).toBe(1);
    });
    it('takes max across tasks', () => {
      const t1 = makeTask([{ type: 'story', text: 'A' }, { type: 'story', text: 'B' }]);
      const t2 = makeTask([{ type: 'story', text: 'C' }]);
      const maxRows = tierMaxRows([makeActivity([t1, t2])], []);
      expect(maxRows[0]).toBe(2);
    });
  });

  describe('storyFlatIndex', () => {
    it('returns index of story at tier 0 slot 0', () => {
      const task = makeTask([{ type: 'story', text: 'S' }]);
      expect(storyFlatIndex(task, 0, 0)).toBe(0);
    });
    it('returns index of story in tier 1', () => {
      const task = makeTask([{ type: 'story', text: 'A' }, { type: 'separator' }, { type: 'story', text: 'B' }]);
      expect(storyFlatIndex(task, 1, 0)).toBe(2);
    });
    it('returns -1 when out of range', () => {
      const task = makeTask([{ type: 'story', text: 'S' }]);
      expect(storyFlatIndex(task, 1, 0)).toBe(-1);
    });
  });

  describe('tierInsertIndex', () => {
    it('returns separator index for tier 0', () => {
      const task = makeTask([{ type: 'story', text: 'S' }, { type: 'separator' }]);
      expect(tierInsertIndex(task, 0)).toBe(1);
    });
    it('returns end of array when no separator', () => {
      const task = makeTask([{ type: 'story', text: 'S' }]);
      expect(tierInsertIndex(task, 0)).toBe(1);
    });
  });

  describe('getStoriesForTier', () => {
    it('returns stories in tier 0', () => {
      const task = makeTask([{ type: 'story', text: 'A' }, { type: 'story', text: 'B' }, { type: 'separator' }, { type: 'story', text: 'C' }]);
      expect(getStoriesForTier(task, 0).map(s => s.text)).toEqual(['A', 'B']);
    });
    it('returns stories in tier 1', () => {
      const task = makeTask([{ type: 'story', text: 'A' }, { type: 'separator' }, { type: 'story', text: 'B' }]);
      expect(getStoriesForTier(task, 1).map(s => s.text)).toEqual(['B']);
    });
    it('returns empty for empty tier', () => {
      const task = makeTask([{ type: 'separator' }]);
      expect(getStoriesForTier(task, 0)).toHaveLength(0);
    });
  });

  describe('releaseForTier', () => {
    it('finds release for tier 0 (release.tier === 1)', () => {
      expect(releaseForTier([makeRelease(1, 'MVP')], 0)?.name).toBe('MVP');
    });
    it('returns undefined when no release for tier', () => {
      expect(releaseForTier([makeRelease(2, 'Beta')], 0)).toBeUndefined();
    });
  });
});
