import { describe, it, expect } from 'vitest';
import { parse } from '../../core/parse';

describe('parse', () => {
  it('parses a simple map', () => {
    const text = `activity: Discovery\n  task: Search\n    story: Find stuff\n`;
    const { model, diagnostics } = parse(text);
    expect(model.activities).toHaveLength(1);
    expect(model.activities[0].name).toBe('Discovery');
    expect(model.activities[0].tasks[0].name).toBe('Search');
    expect(model.activities[0].tasks[0].stories).toHaveLength(1);
    expect(model.activities[0].tasks[0].stories[0]).toMatchObject({ type: 'story', text: 'Find stuff' });
    expect(diagnostics).toHaveLength(0);
  });

  it('parses title', () => {
    const { model } = parse('title: My Map\nactivity: A\ntask: T\nstory: S\n');
    expect(model.title).toBe('My Map');
  });

  it('parses top-level release declarations', () => {
    const { model } = parse('release: MVP @ 1\nactivity: A\ntask: T\nstory: S\n');
    expect(model.releases).toHaveLength(1);
    expect(model.releases[0]).toMatchObject({ name: 'MVP', tier: 1 });
  });

  it('parses multiple releases sorted by tier', () => {
    const { model } = parse('release: Beta @ 2\nrelease: MVP @ 1\nactivity: A\ntask: T\nstory: S\n');
    expect(model.releases[0].tier).toBe(1);
    expect(model.releases[1].tier).toBe(2);
  });

  it('parses release with no name', () => {
    const { model } = parse('release:  @ 1\nactivity: A\ntask: T\nstory: S\n');
    expect(model.releases[0].name).toBeNull();
  });

  it('errors when release: is missing @ tier', () => {
    const { diagnostics } = parse('release: MVP\nactivity: A\ntask: T\nstory: S\n');
    expect(diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it('errors when release tier < 1', () => {
    const { diagnostics } = parse('release: MVP @ 0\nactivity: A\ntask: T\nstory: S\n');
    expect(diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it('warns on legacy inline --- separator', () => {
    const text = `activity: A\ntask: T\nstory: S\n--- MVP\nstory: S2\n`;
    const { diagnostics } = parse(text);
    expect(diagnostics.some((d) => d.message.includes('Inline'))).toBe(true);
  });

  it('is case-insensitive for keywords', () => {
    const { model } = parse('ACTIVITY: A\nTASK: T\nSTORY: S\n');
    expect(model.activities[0].tasks[0].stories[0]).toMatchObject({ type: 'story', text: 'S' });
  });

  it('ignores comments and blank lines', () => {
    const text = `# a comment\n\nactivity: A\n  # another comment\n  task: T\n    story: S\n`;
    const { model } = parse(text);
    expect(model.activities[0].tasks[0].stories).toHaveLength(1);
  });

  it('errors when task has no activity', () => {
    const { diagnostics } = parse('task: T\n');
    expect(diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it('errors when story has no task', () => {
    const { diagnostics } = parse('activity: A\nstory: S\n');
    expect(diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it('warns on no activities', () => {
    const { diagnostics } = parse('');
    expect(diagnostics.some((d) => d.message.includes('No activities'))).toBe(true);
  });

  it('warns on activity with no tasks', () => {
    const { diagnostics } = parse('activity: A\n');
    expect(diagnostics.some((d) => d.message.includes('no tasks'))).toBe(true);
  });

  it('warns on task with no stories', () => {
    const { diagnostics } = parse('activity: A\ntask: T\n');
    expect(diagnostics.some((d) => d.message.includes('no stories'))).toBe(true);
  });

  it('suggests correction for typo keyword', () => {
    const { diagnostics } = parse('activtiy: A\n');
    const d = diagnostics.find((d) => d.suggestion);
    expect(d?.suggestion).toMatch(/activity/i);
  });

  it('suggests singular for plural keyword', () => {
    const { diagnostics } = parse('activities: A\n');
    const d = diagnostics.find((d) => d.suggestion);
    expect(d?.suggestion).toMatch(/activity/);
  });

  it('warns on story text > 120 chars', () => {
    const longText = 'x'.repeat(121);
    const text = `activity: A\ntask: T\nstory: ${longText}\n`;
    const { diagnostics } = parse(text);
    expect(diagnostics.some((d) => d.message.includes('long'))).toBe(true);
  });

  it('warns on duplicate tier numbers', () => {
    const text = `release: MVP @ 1\nrelease: Beta @ 1\nactivity: A\ntask: T\nstory: S\n`;
    const { diagnostics } = parse(text);
    expect(diagnostics.some((d) => d.message.includes('tier 1'))).toBe(true);
  });

  it('assigns unique ids to all entities', () => {
    const text = `activity: A\ntask: T\nstory: S1\nstory: S2\n`;
    const { model } = parse(text);
    const ids = new Set([
      model.activities[0].id,
      model.activities[0].tasks[0].id,
      ...model.activities[0].tasks[0].stories.map((i) => i.id),
    ]);
    expect(ids.size).toBe(4);
  });

  it('ignores indentation', () => {
    const t1 = parse('activity: A\ntask: T\nstory: S\n').model;
    const t2 = parse('activity: A\n    task: T\n        story: S\n').model;
    expect(t1.activities[0].name).toBe(t2.activities[0].name);
    expect(t1.activities[0].tasks[0].stories[0].text).toBe(t2.activities[0].tasks[0].stories[0].text);
  });

  it('tasks have no inline releases in stories array', () => {
    const text = `release: MVP @ 1\nactivity: A\ntask: T\nstory: S1\nstory: S2\n`;
    const { model } = parse(text);
    expect(model.activities[0].tasks[0].stories.every((s) => s.type === 'story')).toBe(true);
  });
});
