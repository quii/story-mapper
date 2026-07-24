import { describe, it, expect } from 'vitest';
import {
  addActivity, removeActivity, renameActivity,
  addTask, removeTask, renameTask, moveTask,
  addStory, removeStory, renameStory, moveStory,
  addReleaseLine, removeReleaseLine, renameRelease, moveReleaseLine,
} from '../../core/model';
import { parse } from '../../core/parse';

function makeModel(text: string) {
  return parse(text).model;
}

const SIMPLE = `activity: A\n  task: T\n    story: S1\n    story: S2\n`;
const TWO_ACT = `activity: A\n  task: T1\n    story: S\nactivity: B\n  task: T2\n    story: S2\n`;
const WITH_RELEASE = `release: MVP @ 2\nactivity: A\n  task: T\n    story: S1\n    story: S2\n    story: S3\n`;

describe('model mutations', () => {
  it('addActivity appends a new activity', () => {
    const m = addActivity(makeModel(SIMPLE));
    expect(m.activities).toHaveLength(2);
    expect(m.activities[1].name).toBe('New activity');
  });

  it('removeActivity removes the correct one', () => {
    const m = removeActivity(makeModel(TWO_ACT), 0);
    expect(m.activities).toHaveLength(1);
    expect(m.activities[0].name).toBe('B');
  });

  it('renameActivity renames correctly', () => {
    const m = renameActivity(makeModel(SIMPLE), 0, 'Discovery');
    expect(m.activities[0].name).toBe('Discovery');
  });

  it('addTask appends a task', () => {
    const m = addTask(makeModel(SIMPLE), 0);
    expect(m.activities[0].tasks).toHaveLength(2);
    expect(m.activities[0].tasks[1].name).toBe('New task');
  });

  it('removeTask removes the correct task', () => {
    const m = removeTask(makeModel(TWO_ACT), 0, 0);
    expect(m.activities[0].tasks).toHaveLength(0);
  });

  it('renameTask renames correctly', () => {
    const m = renameTask(makeModel(SIMPLE), 0, 0, 'Searching');
    expect(m.activities[0].tasks[0].name).toBe('Searching');
  });

  it('moveTask moves within same activity', () => {
    const text = `activity: A\n  task: T1\n    story: S\n  task: T2\n    story: S\n`;
    const m = moveTask(makeModel(text), 0, 0, 0, 1);
    expect(m.activities[0].tasks[0].name).toBe('T2');
  });

  it('moveTask moves across activities', () => {
    const m = moveTask(makeModel(TWO_ACT), 0, 0, 1, 0);
    expect(m.activities[0].tasks).toHaveLength(0);
    expect(m.activities[1].tasks).toHaveLength(2);
  });

  it('addStory appends at given row', () => {
    const m = addStory(makeModel(SIMPLE), 0, 0, 2); // row 2 = append at end
    expect(m.activities[0].tasks[0].stories).toHaveLength(3);
    expect(m.activities[0].tasks[0].stories[2].text).toBe('New story');
  });

  it('addStory inserts at row 0 (prepend)', () => {
    const m = addStory(makeModel(SIMPLE), 0, 0, 0);
    expect(m.activities[0].tasks[0].stories[0].text).toBe('New story');
    expect(m.activities[0].tasks[0].stories[1].text).toBe('S1');
  });

  it('removeStory removes the correct row', () => {
    const m = removeStory(makeModel(SIMPLE), 0, 0, 0);
    expect(m.activities[0].tasks[0].stories).toHaveLength(1);
    expect(m.activities[0].tasks[0].stories[0].text).toBe('S2');
  });

  it('renameStory renames correctly', () => {
    const m = renameStory(makeModel(SIMPLE), 0, 0, 0, 'New text');
    expect(m.activities[0].tasks[0].stories[0].text).toBe('New text');
  });

  it('moveStory moves between rows', () => {
    const m = moveStory(makeModel(SIMPLE), 0, 0, 0, 0, 0, 1);
    // S1 moved from row 0 to row 1; S2 shifts up
    expect(m.activities[0].tasks[0].stories[0].text).toBe('S2');
    expect(m.activities[0].tasks[0].stories[1].text).toBe('S1');
  });

  it('WITH_RELEASE: release is at tier 2 (after row 1)', () => {
    const m = makeModel(WITH_RELEASE);
    expect(m.releases[0]).toMatchObject({ tier: 2 });
  });

  it('addReleaseLine inserts release at correct tier', () => {
    const m = addReleaseLine(makeModel(SIMPLE), 0); // after row 0
    expect(m.releases[0].tier).toBe(1);
  });

  it('addReleaseLine shifts existing releases', () => {
    const base = makeModel('release: MVP @ 2\nactivity: A\ntask: T\nstory: S\n');
    const m = addReleaseLine(base, 0); // insert after row 0
    const tiers = m.releases.map((r) => r.tier).sort();
    expect(tiers).toEqual([1, 3]); // MVP shifted from 2 to 3
  });

  it('removeReleaseLine removes release and shifts tiers', () => {
    const base = makeModel('release: MVP @ 1\nrelease: Beta @ 2\nactivity: A\ntask: T\nstory: S\n');
    const m = removeReleaseLine(base, 1);
    expect(m.releases).toHaveLength(1);
    expect(m.releases[0].name).toBe('Beta');
    expect(m.releases[0].tier).toBe(1); // shifted down
  });

  it('renameRelease renames correctly', () => {
    const base = makeModel('release: MVP @ 1\nactivity: A\ntask: T\nstory: S\n');
    const m = renameRelease(base, 1, 'v1.0');
    expect(m.releases[0].name).toBe('v1.0');
  });

  it('moveReleaseLine moves to empty slot', () => {
    const base = makeModel('release: MVP @ 1\nactivity: X\ntask: T\nstory: S\n');
    const m = moveReleaseLine(base, 1, 3);
    expect(m.releases[0]).toMatchObject({ name: 'MVP', tier: 3 });
  });

  it('moveReleaseLine swaps when target slot occupied', () => {
    const base = makeModel('release: A @ 1\nrelease: B @ 2\nactivity: X\ntask: T\nstory: S\n');
    const m = moveReleaseLine(base, 1, 2);
    const byTier = Object.fromEntries(m.releases.map((r) => [r.tier, r.name]));
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
