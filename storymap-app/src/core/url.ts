export function encodeToHash(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeFromHash(hash: string): string | null {
  try {
    const b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function updateUrlHash(text: string): void {
  history.replaceState(null, '', '#' + encodeToHash(text));
}

export function readUrlHash(): string | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodeFromHash(hash);
}
