/** Tokenise a single line into spans for syntax highlighting */
export interface Token {
  type: 'kw-title' | 'kw-activity' | 'kw-task' | 'kw-story' | 'kw-release' | 'release-tier' | 'value' | 'link' | 'comment' | 'plain';
  text: string;
}

function tokenizeValue(text: string, allowLinks: boolean): Token[] {
  if (!allowLinks) return [{ type: 'value', text }];

  const tokens: Token[] = [];
  const pattern = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\))|(https?:\/\/\S+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) tokens.push({ type: 'value', text: text.slice(last, match.index) });
    tokens.push({ type: 'link', text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ type: 'value', text: text.slice(last) });
  return tokens.length ? tokens : [{ type: 'value', text }];
}

export function tokenizeLine(line: string): Token[] {
  const trimmed = line.trimStart();
  const leading = line.slice(0, line.length - trimmed.length);

  if (trimmed.startsWith('#')) {
    return [{ type: 'comment', text: line }];
  }

  const keywordMatch = trimmed.match(/^(title|activity|task|story|release)\s*:/i);
  if (keywordMatch) {
    const kw = keywordMatch[0];
    const kwName = keywordMatch[1].toLowerCase() as 'title' | 'activity' | 'task' | 'story' | 'release';
    const rest = trimmed.slice(kw.length);
    const kwType = `kw-${kwName}` as Token['type'];
    const isStory = kwName === 'story';

    if (kwName === 'release') {
      const atMatch = rest.match(/^(.*?)(\s*@\s*\d+\s*)$/);
      if (atMatch) {
        return [
          { type: 'plain', text: leading },
          { type: kwType, text: kw },
          { type: 'value', text: atMatch[1] },
          { type: 'release-tier', text: atMatch[2] },
        ];
      }
    }

    return [
      { type: 'plain', text: leading },
      { type: kwType, text: kw },
      ...tokenizeValue(rest, isStory),
    ];
  }

  // Legacy ---
  if (trimmed.startsWith('---')) {
    const dashes = trimmed.match(/^-+/)?.[0] ?? '---';
    const rest = trimmed.slice(dashes.length);
    return [
      { type: 'plain', text: leading },
      { type: 'kw-release', text: dashes },
      { type: 'value', text: rest },
    ];
  }

  return [{ type: 'plain', text: line }];
}
