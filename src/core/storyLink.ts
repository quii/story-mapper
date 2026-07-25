/**
 * Parse a story text string for an optional trailing link.
 *
 * Supported formats (must be at the END of the text):
 *   [label](https://...)    → { label, url }
 *   https://...             → { label: url, url }
 *
 * Returns the display text (everything before the link) and the parsed link.
 */
export interface StoryLink {
  label: string;
  url: string;
}

export interface ParsedStoryText {
  display: string;   // text without the link portion
  link: StoryLink | null;
}

// Matches [label](url) at the end of a string
const MARKDOWN_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*$/;
// Matches a bare URL at the end of a string
const BARE_URL = /(https?:\/\/\S+)\s*$/;

export function parseStoryText(raw: string): ParsedStoryText {
  const mdMatch = raw.match(MARKDOWN_LINK);
  if (mdMatch) {
    return {
      display: raw.slice(0, mdMatch.index).trimEnd(),
      link: { label: mdMatch[1], url: mdMatch[2] },
    };
  }

  const urlMatch = raw.match(BARE_URL);
  if (urlMatch) {
    const url = urlMatch[1];
    const before = raw.slice(0, urlMatch.index).trimEnd();
    // If the whole text is just a URL, use a short hostname as label
    const label = before ? url : (() => {
      try { return new URL(url).hostname; } catch { return url; }
    })();
    return {
      display: before || url,
      link: before ? { label: url, url } : { label, url },
    };
  }

  return { display: raw, link: null };
}
