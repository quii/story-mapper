import { describe, it, expect } from 'vitest';
import {
  addActivity, removeActivity, renameActivity,
  addTask, removeTask, renameTask, moveTask,
  addStory, removeStory, renameStory, moveStory,
  addReleaseLine, removeReleaseLine, renameRelease, moveReleaseLine,
} from '../../core/model';
import { parse } from '../../core/parse';

function makeModel(text: string) { return parse(text).model; }

const SIMPLE = `activity: A\n  task: T\n    story: S1\n    story: S2\n`;
const TWO_ACT = `activity: A\n  task: T1\n    story: S\nactivity: B\n  task: T2\n    story: S2\n`;
const WITH_SEP = `activity: A\n  task: T\n    story: S1\n    ---\n    story: S2\n`;

describe('model mutations', () => {
  it('addActivity appends a new activity', () => {
    expect(addActivity(makeModel(SIMPLE)).activities).toHaveLength(2);
  });

  it('removeActivity removes the correct one', () => {
    const m = removeActivity(makeModel(TWO_ACT), 0);
    expect(m.activities[0].name).toBe('B');
  });

  it('renameActivity renames correctly', () => {
    expect(renameActivity(makeModel(SIMPLE), 0, 'Discovery').activities[0].name).toBe('Discovery');
  });

  it('addTask appends a task', () => {
    expect(addTask(makeModel(SIMPLE), 0).activities[0].tasks).toHaveLength(2);
  });

  it('removeTask removes the correct task', () => {
    expect(removeTask(makeModel(TWO_ACT), 0, 0).activities[0].tasks).toHaveLength(0);
  });

  it('renameTask renames correctly', () => {
    expect(renameTask(makeModel(SIMPLE), 0, 0, 'Searching').activities[0].tasks[0].name).toBe('Searching');
  });

  it('moveTask moves within same activity', () => {
    const text = `activity: A\n  task: T1\n    story: S\n  task: T2\n    story: S\n`;
    expect(moveTask(makeModel(text), 0, 0, 0, 1).activities[0].tasks[0].name).toBe('T2');
  });

  it('moveTask moves across activities', () => {
    const m = moveTask(makeModel(TWO_ACT), 0, 0, 1, 0);
    expect(m.activities[0].tasks).toHaveLength(0);
    expect(m.activities[1].tasks).toHaveLength(2);
  });

  it('addStory appends at end of tier 0', () => {
    const m = addStory(makeModel(SIMPLE), 0, 0, 0);
    const stories = m.activities[0].tasks[0].items.filter(i => i.type === 'story');
    expect(stories).toHaveLength(3);
    expect((stories[2] as any).text).toBe('New story');
  });

  it('addStory appends to tier 1 when separator exists', () => {
    const m = addStory(makeModel(WITH_SEP), 0, 0, 1);
    const items = m.activities[0].tasks[0].items;
    const stories = items.filter(i => i.type === 'story');
    expect(stories).toHaveLength(3);
    expect((stories[2] as any).text).toBe('New story');
  });

  it('removeStory removes the correct story', () => {
    const m = removeStory(makeModel(SIMPLE), 0, 0, 0, 0);
    const stories = m.activities[0].tasks[0].items.filter(i => i.type === 'story');
    expect(stories).toHaveLength(1);
    expect((stories[0] as any).text).toBe('S2');
  });

  it('renameStory renames correctly', () => {
    const m = renameStory(makeModel(SIMPLE), 0, 0, 0, 0, 'New text');
    expect((m.activities[0].tasks[0].items[0] as any).text).toBe('New text');
  });

  it('moveStory moves between tiers', () => {
    // Move S1 from tier 0 to tier 1
    const m = moveStory(makeModel(WITH_SEP), 0, 0, 0, 0, 0, 0, 1, null);
    const items = m.activities[0].tasks[0].items;
    // tier 0 should now have only S2, tier 1 should have S2 then S1
    const t0 = items.filter((item, i) => {
      let tier = 0;
      for (let j = 0; j < i; j++) if (items[j].type === 'separator') tier++;
      return item.type === 'story' && tier === 0;
    });
    expect(t0).toHaveLength(0); // S1 moved out of tier 0
  });

  it('addReleaseLine inserts separator in all tasks and adds release', () => {
    const m = addReleaseLine(makeModel(SIMPLE), 0);
    expect(m.releases).toHaveLength(1);
    expect(m.releases[0].tier).toBe(1);
    expect(m.activities[0].tasks[0].items.some(i => i.type === 'separator')).toBe(true);
  });

  it('removeReleaseLine removes release and separator', () => {
    const base = makeModel('release: MVP @ 1\nactivity: A\n  task: T\n    story: S1\n    ---\n    story: S2\n');
    const m = removeReleaseLine(base, 1);
    expect(m.releases).toHaveLength(0);
    expect(m.activities[0].tasks[0].items.every(i => i.type !== 'separator')).toBe(true);
  });

  it('renameRelease renames correctly', () => {
    const base = makeModel('release: MVP @ 1\nactivity: A\n  task: T\n    story: S\n');
    expect(renameRelease(base, 1, 'v1.0').releases[0].name).toBe('v1.0');
  });

  it('moveReleaseLine swaps tiers', () => {
    const base = makeModel('release: A @ 1\nrelease: B @ 2\nactivity: X\n  task: T\n    story: S\n');
    const m = moveReleaseLine(base, 1, 2);
    const byTier = Object.fromEntries(m.releases.map(r => [r.tier, r.name]));
    expect(byTier[1]).toBe('B');
    expect(byTier[2]).toBe('A');
  });

  it('mutations are immutable', () => {
    const original = makeModel(SIMPLE);
    const m = addActivity(original);
    expect(original.activities).toHaveLength(1);
    expect(m.activities).toHaveLength(2);
  });
});
