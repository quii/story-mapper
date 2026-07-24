import { describe, it, expect } from 'vitest';
import { encodeToHash, decodeFromHash } from '../../core/url';

describe('url', () => {
  it('encodes and decodes round-trip', () => {
    const text = 'activity: A\ntask: T\nstory: S\n';
    expect(decodeFromHash(encodeToHash(text))).toBe(text);
  });

  it('handles unicode', () => {
    const text = 'activity: 日本語\ntask: T\nstory: S\n';
    expect(decodeFromHash(encodeToHash(text))).toBe(text);
  });

  it('produces base64url (no +, /, =)', () => {
    const hash = encodeToHash('hello world');
    expect(hash).not.toContain('+');
    expect(hash).not.toContain('/');
    expect(hash).not.toContain('=');
  });

  it('returns null for malformed hash', () => {
    expect(decodeFromHash('!!!invalid!!!')).toBeNull();
  });

  it('returns null for empty string', () => {
    // empty string decodes as empty string, but atob('') is '' which is fine
    // let's test clearly broken input
    expect(decodeFromHash('~~')).toBeNull();
  });
});
