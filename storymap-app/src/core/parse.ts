import { v4 as uuidv4 } from 'uuid';
import type { Activity, Diagnostic, ParseResult, Release, StoryItem, Task } from './types';

const KEYWORDS = ['title', 'activity', 'task', 'story', 'release'];

const PLURAL_MAP: Record<string, string> = {
  activities: 'activity',
  tasks: 'task',
  stories: 'story',
  releases: 'release',
};

function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function closestKeyword(word: string): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const kw of KEYWORDS) {
    const d = editDistance(word.toLowerCase(), kw);
    if (d < bestDist) {
      bestDist = d;
      best = kw;
    }
  }
  return bestDist <= 2 ? best : null;
}

export function parse(text: string): ParseResult {
  const diagnostics: Diagnostic[] = [];
  const activities: Activity[] = [];
  const releases: Release[] = [];
  let title: string | null = null;
  let curAct: Activity | null = null;
  let curTask: Task | null = null;

  const lines = text.split('\n');

  const warn = (line: number, message: string, suggestion?: string) =>
    diagnostics.push({ severity: 'warning', line, message, suggestion });
  const error = (line: number, message: string, suggestion?: string) =>
    diagnostics.push({ severity: 'error', line, message, suggestion });

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const line = rawLine.trim();

    if (line === '' || line.startsWith('#')) return;

    if (/^title\s*:/i.test(line)) {
      title = line.replace(/^title\s*:\s*/i, '').trim() || null;
      return;
    }

    // Top-level release: NAME @ TIER  (e.g.  release: MVP @ 1)
    if (/^release\s*:/i.test(line)) {
      const body = line.replace(/^release\s*:\s*/i, '').trim();
      const atMatch = body.match(/^(.*?)\s*@\s*(\d+)\s*$/);
      if (!atMatch) {
        error(lineNo, '`release:` must include a tier number, e.g. `release: MVP @ 1`');
        return;
      }
      const name = atMatch[1].trim() || null;
      const tier = parseInt(atMatch[2], 10);
      if (tier < 1) {
        error(lineNo, 'Release tier must be 1 or greater.');
        return;
      }
      releases.push({ id: uuidv4(), name, tier });
      return;
    }

    // Legacy inline --- separator — warn and skip
    if (/^---/.test(line)) {
      const name = line.replace(/^-+\s*/, '').trim() || null;
      warn(
        lineNo,
        'Inline `---` separators are no longer supported.',
        `Use a top-level declaration instead: \`release: ${name ?? 'Release name'} @ 1\``
      );
      return;
    }

    if (/^activity\s*:/i.test(line)) {
      const name = line.replace(/^activity\s*:\s*/i, '').trim();
      curAct = { id: uuidv4(), name, tasks: [] };
      activities.push(curAct);
      curTask = null;
      return;
    }

    if (/^task\s*:/i.test(line)) {
      if (!curAct) {
        error(lineNo, '`task:` used before any `activity:`');
        return;
      }
      const name = line.replace(/^task\s*:\s*/i, '').trim();
      curTask = { id: uuidv4(), name, stories: [] };
      curAct.tasks.push(curTask);
      return;
    }

    if (/^story\s*:/i.test(line)) {
      if (!curTask) {
        error(lineNo, '`story:` used before any `task:`');
        return;
      }
      const text = line.replace(/^story\s*:\s*/i, '').trim();
      if (text.length > 120) {
        warn(lineNo, 'Story text is very long (> 120 chars); consider shortening for readability.');
      }
      const item: StoryItem = { id: uuidv4(), type: 'story', text };
      curTask.stories.push(item);
      return;
    }

    // Unknown keyword detection
    const firstWord = line.split(/[\s:]/)[0].toLowerCase();
    if (firstWord) {
      const plural = PLURAL_MAP[firstWord];
      if (plural) {
        warn(lineNo, `Unknown keyword \`${firstWord}\``, `Did you mean \`${plural}:\`?`);
        return;
      }
      const closest = closestKeyword(firstWord);
      if (closest) {
        warn(lineNo, `Unknown keyword \`${firstWord}\``, `Did you mean \`${closest}:\`?`);
      }
    }
  });

  // Structural warnings
  if (activities.length === 0) {
    warn(0, 'No activities defined. Add at least one `activity:` line.');
  }
  for (const act of activities) {
    if (act.tasks.length === 0) {
      warn(0, `Activity "${act.name}" has no tasks.`);
    }
    for (const task of act.tasks) {
      if (task.stories.length === 0) {
        warn(0, `Task "${task.name}" has no stories.`);
      }
    }
  }

  // Warn on duplicate tier numbers
  const tiersSeen = new Map<number, string>();
  for (const rel of releases) {
    if (tiersSeen.has(rel.tier)) {
      warn(0, `Two releases assigned to tier ${rel.tier}: "${tiersSeen.get(rel.tier)}" and "${rel.name ?? ''}". Only one release per tier is allowed.`);
    } else {
      tiersSeen.set(rel.tier, rel.name ?? '');
    }
  }

  // Sort releases by tier for predictable iteration
  releases.sort((a, b) => a.tier - b.tier);

  return { model: { title, releases, activities }, diagnostics };
}
