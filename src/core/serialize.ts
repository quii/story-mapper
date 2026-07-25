import type { StoryMap } from './types';

export function serialize(model: StoryMap): string {
  const lines: string[] = [];

  if (model.title) {
    lines.push(`title: ${model.title}`);
    lines.push('');
  }

  if (model.releases.length > 0) {
    for (const rel of model.releases) {
      lines.push(`release: ${rel.name ?? ''} @ ${rel.tier}`.trimEnd());
    }
    lines.push('');
  }

  model.activities.forEach((act) => {
    lines.push(`activity: ${act.name}`);
    act.tasks.forEach((task) => {
      lines.push(`  task: ${task.name}`);
      task.items.forEach((item) => {
        if (item.type === 'story') {
          lines.push(`    story: ${item.text}`);
        } else {
          lines.push(`    ---`);
        }
      });
    });
    lines.push('');
  });

  return lines.join('\n').trimEnd() + '\n';
}
