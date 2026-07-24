import { describe, it, expect } from 'vitest';
import { parse } from '../../core/parse';
import { serialize } from '../../core/serialize';
import type { StoryMap } from '../../core/types';

function makeSimple(): StoryMap {
  return parse('activity: A\ntask: T\nstory: S\n').model;
}

describe('serialize', () => {
  it('serializes a simple map', () => {
    const text = serialize(makeSimple());
    expect(text).toContain('activity: A');
    expect(text).toContain('  task: T');
    expect(text).toContain('    story: S');
  });

  it('serializes title', () => {
    const model = parse('title: T\nactivity: A\ntask: T1\nstory: S\n').model;
    expect(serialize(model)).toContain('title: T');
  });

  it('serializes top-level releases', () => {
    const model = parse('release: MVP @ 1\nactivity: A\ntask: T\nstory: S\n').model;
    expect(serialize(model)).toContain('release: MVP @ 1');
  });

  it('serializes releases before activities', () => {
    const model = parse('release: MVP @ 1\nactivity: A\ntask: T\nstory: S\n').model;
    const text = serialize(model);
    expect(text.indexOf('release:')).toBeLessThan(text.indexOf('activity:'));
  });

  it('serializes nameless release as "release:  @ N"', () => {
    const model = parse('release:  @ 2\nactivity: A\ntask: T\nstory: S\n').model;
    expect(serialize(model)).toMatch(/release:\s*@ 2/);
  });

  it('round-trips through parse', () => {
    const original = 'release: MVP @ 1\nactivity: A\n  task: T\n    story: S1\n    story: S2\n';
    const { model } = parse(original);
    const roundTripped = serialize(model);
    const { model: m2 } = parse(roundTripped);
    expect(m2.releases[0]).toMatchObject({ name: 'MVP', tier: 1 });
    expect(m2.activities[0].tasks[0].stories).toHaveLength(2);
  });

  it('separates activities with blank lines', () => {
    const model = parse('activity: A\ntask: T\nstory: S\nactivity: B\ntask: T2\nstory: S2\n').model;
    const text = serialize(model);
    expect(text).toMatch(/activity: A[\s\S]*\n\nactivity: B/);
  });

  it('does not emit inline --- separators', () => {
    const model = parse('release: MVP @ 1\nactivity: A\ntask: T\nstory: S\n').model;
    expect(serialize(model)).not.toContain('---');
  });
});
