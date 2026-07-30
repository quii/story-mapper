const KEY = 'story-mapper:backup';

export interface LocalBackup {
  text: string;
  srcUrl: string | null;
}

export function readLocalBackup(): LocalBackup | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.text === 'string') {
        return { text: parsed.text, srcUrl: typeof parsed.srcUrl === 'string' ? parsed.srcUrl : null };
      }
    } catch {
      // pre-existing backups were stored as raw text, not JSON — fall through
    }
    return { text: raw, srcUrl: null };
  } catch {
    return null;
  }
}

export function saveLocalBackup(text: string, srcUrl: string | null = null): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ text, srcUrl }));
  } catch {
    // ignore (private browsing, quota exceeded, etc.)
  }
}
