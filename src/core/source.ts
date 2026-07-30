export function readSrcParam(): string | null {
  return new URLSearchParams(window.location.search).get('src');
}

export async function fetchSource(url: string): Promise<string> {
  // no-store: a sync is a deliberate "get me the latest" action, so it must
  // bypass the HTTP cache rather than risk serving a stale static asset.
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.text();
}
