import type { StoryMap } from '../../core/types';
import { serialize } from '../../core/serialize';
import { escapeHtml } from '../../core/escapeHtml';

export function exportHtml(model: StoryMap): void {
  // Capture existing styles
  const styleEl = document.querySelector('style');
  const styles = styleEl ? styleEl.textContent ?? '' : '';

  const text = serialize(model);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(model.title ?? 'Story Map')}</title>
<style>
${styles}
body { margin: 0; background: #f7f7f5; font-family: sans-serif; }
</style>
</head>
<body>
<pre style="padding:24px;font-size:13px;line-height:1.6;font-family:monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${model.title ?? 'storymap'}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
