import { describe, it, expect } from 'vitest';
import { cardTilt } from '../../core/cardTilt';

describe('cardTilt', () => {
  it('is deterministic for the same id', () => {
    expect(cardTilt('story-123')).toBe(cardTilt('story-123'));
  });

  it('stays within the -1.5..1.5 degree range', () => {
    for (const id of ['a', 'story-123', 'abcdefg-hijklmnop', '', '🎉']) {
      const tilt = cardTilt(id);
      expect(tilt).toBeGreaterThanOrEqual(-1.5);
      expect(tilt).toBeLessThanOrEqual(1.5);
    }
  });

  it('varies across different ids', () => {
    const tilts = new Set(['a', 'b', 'c', 'd', 'e'].map(cardTilt));
    expect(tilts.size).toBeGreaterThan(1);
  });
});
