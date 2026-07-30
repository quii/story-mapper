import { describe, it, expect, beforeEach } from 'vitest';
import { readLocalBackup, saveLocalBackup } from '../../core/localBackup';

const KEY = 'story-mapper:backup';

describe('localBackup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is saved', () => {
    expect(readLocalBackup()).toBeNull();
  });

  it('round-trips text and srcUrl', () => {
    saveLocalBackup('activity: A\n', 'https://example.com/map.txt');
    expect(readLocalBackup()).toEqual({ text: 'activity: A\n', srcUrl: 'https://example.com/map.txt' });
  });

  it('defaults srcUrl to null when omitted', () => {
    saveLocalBackup('activity: A\n');
    expect(readLocalBackup()).toEqual({ text: 'activity: A\n', srcUrl: null });
  });

  it('reads pre-existing raw-text backups as legacy, srcUrl-less entries', () => {
    localStorage.setItem(KEY, 'activity: Legacy\ntask: T\n');
    expect(readLocalBackup()).toEqual({ text: 'activity: Legacy\ntask: T\n', srcUrl: null });
  });
});
