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

  it('addStory inserts at the given row, pushing existing rows down', () => {
    const m = addStory(makeModel(SIMPLE), 0, 0, 0);
    const items = m.activities[0].tasks[0].items;
    expect(items).toHaveLength(3);
    expect((items[0] as any).text).toBe('New story');
    expect((items[1] as any).text).toBe('S1');
    expect((items[2] as any).text).toBe('S2');
  });

  it('addStory pads with separators when the row is past the end', () => {
    const m = addStory(makeModel(SIMPLE), 0, 0, 4);
    const items = m.activities[0].tasks[0].items;
    expect(items).toHaveLength(5);
    expect(items[2].type).toBe('separator');
    expect(items[3].type).toBe('separator');
    expect((items[4] as any).text).toBe('New story');
  });

  it('addStory can insert before an existing separator row', () => {
    const m = addStory(makeModel(WITH_SEP), 0, 0, 1);
    const items = m.activities[0].tasks[0].items;
    expect((items[0] as any).text).toBe('S1');
    expect((items[1] as any).text).toBe('New story');
    expect(items[2].type).toBe('separator');
    expect((items[3] as any).text).toBe('S2');
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

  it('moveStory moves a story onto an empty row, filling a separator gap', () => {
    // WITH_SEP items: [S1, ---, S2]. Move S1 (row 0) onto row 1 (the separator).
    const m = moveStory(makeModel(WITH_SEP), 0, 0, 0, 0, 0, 0, 1, null);
    const items = m.activities[0].tasks[0].items;
    expect(items).toHaveLength(2);
    expect(items.every(i => i.type === 'story')).toBe(true);
    expect((items[0] as any).text).toBe('S1');
    expect((items[1] as any).text).toBe('S2');
  });

  it('moveStory inserts before an already-occupied row, pushing it down', () => {
    // SIMPLE items: [S1, S2]. Move S2 (row 1) onto row 0, which already holds S1.
    const m = moveStory(makeModel(SIMPLE), 0, 0, 1, 0, 0, 0, 0, 0);
    const items = m.activities[0].tasks[0].items;
    expect(items).toHaveLength(2);
    expect((items[0] as any).text).toBe('S2');
    expect((items[1] as any).text).toBe('S1');
  });

  it('addReleaseLine adds a release without touching any task items', () => {
    const before = makeModel(SIMPLE);
    const m = addReleaseLine(before, 0);
    expect(m.releases).toHaveLength(1);
    expect(m.releases[0].tier).toBe(1);
    expect(m.activities[0].tasks[0].items).toEqual(before.activities[0].tasks[0].items);
  });

  it('removeReleaseLine removes the release without touching any task items', () => {
    const base = makeModel('release: MVP @ 1\nactivity: A\n  task: T\n    story: S1\n    ---\n    story: S2\n');
    const m = removeReleaseLine(base, 1);
    expect(m.releases).toHaveLength(0);
    expect(m.activities[0].tasks[0].items).toEqual(base.activities[0].tasks[0].items);
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
