const KEY = 'story-mapper:backup';

export function readLocalBackup(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveLocalBackup(text: string): void {
  try {
    localStorage.setItem(KEY, text);
  } catch {
    // ignore (private browsing, quota exceeded, etc.)
  }
}
