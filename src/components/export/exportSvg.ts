import type { StoryMap } from '../../core/types';
import { allTasks, tierCount, tierMaxRows, tierRawIndices, getStoriesForTier, releaseForTier } from '../../core/layout';
import { releaseColor } from '../../core/palette';
import { storyDisplayText } from '../../core/storyDone';
import { parseStoryText } from '../../core/storyLink';
import { escapeHtml } from '../../core/escapeHtml';

const PAD = 24, CARD_W = 190, GAP = 4;
const ACT_H = 44, TASK_H = 40, STORY_H = 72, RELEASE_H = 28, TITLE_H = 44;
const HAND_FONT = `'Kalam', cursive`;

function wrapText(str: string, maxLen = 26): string[] {
  const words = str.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur.length + w.length + (cur ? 1 : 0) > maxLen) { if (cur) lines.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

function svgText(x: number, y: number, text: string, attrs = '') {
  return `<text x="${x}" y="${y}" ${attrs}>${escapeHtml(text)}</text>`;
}

export function exportSvg(model: StoryMap): void {
  const { activities, releases } = model;
  const flatTasks = allTasks(activities);
  const numCols = flatTasks.length;
  const numTiers = tierCount(activities, releases);
  const maxRows = tierMaxRows(activities, releases);
  const rawIndices = tierRawIndices(activities, releases);

  const titleH = model.title ? TITLE_H : 0;
  const totalW = PAD * 2 + numCols * CARD_W + (numCols - 1) * GAP;
  let totalH = PAD * 2 + titleH + ACT_H + GAP + TASK_H + GAP;
  for (let t = 0; t < numTiers; t++) {
    totalH += (maxRows[t] ?? 0) * (STORY_H + GAP);
    if (releaseForTier(releases, t)) totalH += RELEASE_H + GAP;
  }

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}">`);
  parts.push(`<rect width="${totalW}" height="${totalH}" fill="#eceef0"/>`);

  let y = PAD;
  if (model.title) {
    parts.push(svgText(PAD, y + 28, model.title, `font-size="22" font-weight="700" fill="#1a1a18" font-family="${HAND_FONT}"`));
    y += TITLE_H;
  }

  let colOffset = 0;
  activities.forEach(act => {
    const tc = Math.max(act.tasks.length, 1);
    const actW = tc * CARD_W + (tc - 1) * GAP;
    const x = PAD + colOffset;
    parts.push(`<rect x="${x}" y="${y}" width="${actW}" height="${ACT_H}" rx="8" fill="#1a1a18"/>`);
    parts.push(svgText(x + actW / 2, y + 27, act.name, `font-size="15" font-weight="700" fill="#fff" font-family="${HAND_FONT}" text-anchor="middle"`));
    colOffset += actW + GAP;
  });
  y += ACT_H + GAP;

  flatTasks.forEach(({ task }, ci) => {
    const x = PAD + ci * (CARD_W + GAP);
    parts.push(`<rect x="${x}" y="${y}" width="${CARD_W}" height="${TASK_H}" rx="6" fill="#e8e4de"/>`);
    parts.push(svgText(x + CARD_W / 2, y + 25, task.name, `font-size="14" font-weight="700" fill="#1a1a18" font-family="${HAND_FONT}" text-anchor="middle"`));
  });
  y += TASK_H + GAP;

  for (let tier = 0; tier < numTiers; tier++) {
    const rows = maxRows[tier] ?? 0;
    for (let slot = 0; slot < rows; slot++) {
      flatTasks.forEach(({ task }, ci) => {
        const story = getStoriesForTier(task, rawIndices[tier])[slot];
        const x = PAD + ci * (CARD_W + GAP);
        const sy = y + slot * (STORY_H + GAP);
        parts.push(`<rect x="${x}" y="${sy}" width="${CARD_W}" height="${STORY_H}" rx="4" fill="#fffdf6" stroke="#e6dfc9" stroke-width="1"/>`);
        if (story) {
          const { display } = parseStoryText(storyDisplayText(story.text));
          wrapText(display).forEach((line, li) => {
            parts.push(svgText(x + 10, sy + 22 + li * 20, line, `font-size="14" font-weight="700" fill="#1a1a18" font-family="${HAND_FONT}"`));
          });
        }
      });
    }
    y += rows * (STORY_H + GAP);

    const release = releaseForTier(releases, tier);
    if (release) {
      const color = releaseColor(tier);
      const label = release.name ?? '';
      const labelW = Math.max(label.length * 7 + 20, 60);
      parts.push(`<rect x="${PAD}" y="${y}" width="${labelW}" height="${RELEASE_H}" rx="12" fill="${color}"/>`);
      parts.push(svgText(PAD + labelW / 2, y + 18, label.toUpperCase(), `font-size="10" font-weight="600" fill="#fff" font-family="sans-serif" text-anchor="middle"`));
      const lineX = PAD + labelW + 8;
      const lineW = totalW - PAD - lineX;
      if (lineW > 0) parts.push(`<rect x="${lineX}" y="${y + RELEASE_H / 2}" width="${lineW}" height="2" fill="${color}" opacity="0.4"/>`);
      y += RELEASE_H + GAP;
    }
  }

  parts.push('</svg>');
  const blob = new Blob([parts.join('\n')], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${model.title ?? 'storymap'}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
