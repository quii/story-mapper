import { describe, it, expect } from 'vitest';
import { parse } from '../../core/parse';
import { serialize } from '../../core/serialize';

describe('serialize', () => {
  it('serializes a simple map', () => {
    const text = serialize(parse('activity: A\ntask: T\nstory: S\n').model);
    expect(text).toContain('activity: A');
    expect(text).toContain('  task: T');
    expect(text).toContain('    story: S');
  });

  it('serializes title', () => {
    expect(serialize(parse('title: T\nactivity: A\ntask: T1\nstory: S\n').model)).toContain('title: T');
  });

  it('serializes top-level releases', () => {
    expect(serialize(parse('release: MVP @ 1\nactivity: A\ntask: T\nstory: S\n').model)).toContain('release: MVP @ 1');
  });

  it('serializes --- tier separators', () => {
    const model = parse('activity: A\ntask: T\nstory: S1\n---\nstory: S2\n').model;
    expect(serialize(model)).toContain('    ---');
  });

  it('round-trips through parse', () => {
    const original = 'release: MVP @ 1\nactivity: A\n  task: T\n    story: S1\n    ---\n    story: S2\n';
    const { model } = parse(original);
    const { model: m2 } = parse(serialize(model));
    expect(m2.releases[0]).toMatchObject({ name: 'MVP', tier: 1 });
    expect(m2.activities[0].tasks[0].items).toHaveLength(3);
  });

  it('separates activities with blank lines', () => {
    const model = parse('activity: A\ntask: T\nstory: S\nactivity: B\ntask: T2\nstory: S2\n').model;
    expect(serialize(model)).toMatch(/activity: A[\s\S]*\n\nactivity: B/);
  });
});
