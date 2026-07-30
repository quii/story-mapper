import { describe, it, expect, vi, afterEach } from 'vitest';
import { readSrcParam, fetchSource } from '../../core/source';

describe('readSrcParam', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('reads the src query param', () => {
    window.history.replaceState(null, '', '/?src=https%3A%2F%2Fexample.com%2Fmap.txt');
    expect(readSrcParam()).toBe('https://example.com/map.txt');
  });

  it('returns null when absent', () => {
    window.history.replaceState(null, '', '/');
    expect(readSrcParam()).toBeNull();
  });
});

describe('fetchSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns response text on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('activity: A\n') })
    );
    await expect(fetchSource('https://example.com/map.txt')).resolves.toBe('activity: A\n');
  });

  it('throws with status info on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })
    );
    await expect(fetchSource('https://example.com/missing.txt')).rejects.toThrow('404 Not Found');
  });
});
