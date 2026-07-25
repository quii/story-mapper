import { describe, it, expect } from 'vitest';
import { parse } from '../../core/parse';

describe('parse', () => {
  it('parses a simple map', () => {
    const text = `activity: Discovery\n  task: Search\n    story: Find stuff\n`;
    const { model, diagnostics } = parse(text);
    expect(model.activities[0].name).toBe('Discovery');
    expect(model.activities[0].tasks[0].name).toBe('Search');
    const stories = model.activities[0].tasks[0].items.filter(i => i.type === 'story');
    expect(stories).toHaveLength(1);
    expect(stories[0]).toMatchObject({ type: 'story', text: 'Find stuff' });
    expect(diagnostics).toHaveLength(0);
  });

  it('parses title', () => {
    expect(parse('title: My Map\nactivity: A\ntask: T\nstory: S\n').model.title).toBe('My Map');
  });

  it('parses top-level release declarations', () => {
    const { model } = parse('release: MVP @ 1\nactivity: A\ntask: T\nstory: S\n');
    expect(model.releases[0]).toMatchObject({ name: 'MVP', tier: 1 });
  });

  it('parses multiple releases sorted by tier', () => {
    const { model } = parse('release: Beta @ 2\nrelease: MVP @ 1\nactivity: A\ntask: T\nstory: S\n');
    expect(model.releases[0].tier).toBe(1);
    expect(model.releases[1].tier).toBe(2);
  });

  it('parses --- as a tier separator inside a task', () => {
    const text = `activity: A\ntask: T\nstory: S1\n---\nstory: S2\n`;
    const { model, diagnostics } = parse(text);
    const items = model.activities[0].tasks[0].items;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ type: 'story', text: 'S1' });
    expect(items[1]).toMatchObject({ type: 'separator' });
    expect(items[2]).toMatchObject({ type: 'story', text: 'S2' });
    expect(diagnostics.some(d => d.severity === 'error')).toBe(false);
  });

  it('errors when release: is missing @ tier', () => {
    expect(parse('release: MVP\nactivity: A\ntask: T\nstory: S\n').diagnostics.some(d => d.severity === 'error')).toBe(true);
  });

  it('errors when release tier < 1', () => {
    expect(parse('release: MVP @ 0\nactivity: A\ntask: T\nstory: S\n').diagnostics.some(d => d.severity === 'error')).toBe(true);
  });

  it('is case-insensitive for keywords', () => {
    const { model } = parse('ACTIVITY: A\nTASK: T\nSTORY: S\n');
    expect(model.activities[0].tasks[0].items[0]).toMatchObject({ type: 'story', text: 'S' });
  });

  it('ignores comments and blank lines', () => {
    const { model } = parse(`# comment\n\nactivity: A\n  task: T\n    story: S\n`);
    expect(model.activities[0].tasks[0].items.filter(i => i.type === 'story')).toHaveLength(1);
  });

  it('errors when task has no activity', () => {
    expect(parse('task: T\n').diagnostics.some(d => d.severity === 'error')).toBe(true);
  });

  it('errors when story has no task', () => {
    expect(parse('activity: A\nstory: S\n').diagnostics.some(d => d.severity === 'error')).toBe(true);
  });

  it('warns on no activities', () => {
    expect(parse('').diagnostics.some(d => d.message.includes('No activities'))).toBe(true);
  });

  it('warns on activity with no tasks', () => {
    expect(parse('activity: A\n').diagnostics.some(d => d.message.includes('no tasks'))).toBe(true);
  });

  it('warns on task with no stories', () => {
    expect(parse('activity: A\ntask: T\n').diagnostics.some(d => d.message.includes('no stories'))).toBe(true);
  });

  it('suggests correction for typo keyword', () => {
    const d = parse('activtiy: A\n').diagnostics.find(d => d.suggestion);
    expect(d?.suggestion).toMatch(/activity/i);
  });

  it('suggests singular for plural keyword', () => {
    const d = parse('activities: A\n').diagnostics.find(d => d.suggestion);
    expect(d?.suggestion).toMatch(/activity/);
  });

  it('warns on story text > 120 chars', () => {
    expect(parse(`activity: A\ntask: T\nstory: ${'x'.repeat(121)}\n`).diagnostics.some(d => d.message.includes('long'))).toBe(true);
  });

  it('warns on duplicate tier numbers', () => {
    expect(parse('release: MVP @ 1\nrelease: Beta @ 1\nactivity: A\ntask: T\nstory: S\n').diagnostics.some(d => d.message.includes('tier 1'))).toBe(true);
  });

  it('assigns unique ids to all entities', () => {
    const { model } = parse(`activity: A\ntask: T\nstory: S1\nstory: S2\n`);
    const ids = new Set([model.activities[0].id, model.activities[0].tasks[0].id, ...model.activities[0].tasks[0].items.map(i => i.id)]);
    expect(ids.size).toBe(4);
  });

  it('ignores indentation', () => {
    const t1 = parse('activity: A\ntask: T\nstory: S\n').model;
    const t2 = parse('activity: A\n    task: T\n        story: S\n').model;
    expect((t1.activities[0].tasks[0].items[0] as any).text).toBe((t2.activities[0].tasks[0].items[0] as any).text);
  });
});
