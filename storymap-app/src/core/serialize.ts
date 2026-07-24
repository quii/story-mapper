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
      task.stories.forEach((story) => {
        lines.push(`    story: ${story.text}`);
      });
    });
    lines.push('');
  });

  return lines.join('\n').trimEnd() + '\n';
}
