import { v4 as uuidv4 } from 'uuid';
import type { Activity, StoryMap, Task, TierSeparator } from './types';
import { storyFlatIndex, tierInsertIndex, separatorIndex } from './layout';

// ── Activities ────────────────────────────────────────────────────────────────

export function addActivity(model: StoryMap): StoryMap {
  return { ...model, activities: [...model.activities, { id: uuidv4(), name: 'New activity', tasks: [] }] };
}

export function removeActivity(model: StoryMap, actIdx: number): StoryMap {
  return { ...model, activities: model.activities.filter((_, i) => i !== actIdx) };
}

export function renameActivity(model: StoryMap, actIdx: number, name: string): StoryMap {
  return updateActivity(model, actIdx, a => ({ ...a, name }));
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function addTask(model: StoryMap, actIdx: number): StoryMap {
  const newTask: Task = { id: uuidv4(), name: 'New task', items: [] };
  return updateActivity(model, actIdx, a => ({ ...a, tasks: [...a.tasks, newTask] }));
}

export function removeTask(model: StoryMap, actIdx: number, taskIdx: number): StoryMap {
  return updateActivity(model, actIdx, a => ({ ...a, tasks: a.tasks.filter((_, i) => i !== taskIdx) }));
}

export function renameTask(model: StoryMap, actIdx: number, taskIdx: number, name: string): StoryMap {
  return updateTask(model, actIdx, taskIdx, t => ({ ...t, name }));
}

export function moveTask(model: StoryMap, fromActIdx: number, fromTaskIdx: number, toActIdx: number, toTaskIdx: number): StoryMap {
  if (fromActIdx === toActIdx && fromTaskIdx === toTaskIdx) return model;
  const activities = model.activities.map(a => ({ ...a, tasks: [...a.tasks] }));
  const task = activities[fromActIdx].tasks[fromTaskIdx];
  activities[fromActIdx].tasks.splice(fromTaskIdx, 1);
  activities[toActIdx].tasks.splice(toTaskIdx, 0, task);
  return { ...model, activities };
}

// ── Stories ───────────────────────────────────────────────────────────────────

export function addStory(model: StoryMap, actIdx: number, taskIdx: number, tier: number): StoryMap {
  return updateTask(model, actIdx, taskIdx, t => {
    const items = [...t.items];
    items.splice(tierInsertIndex(t, tier), 0, { id: uuidv4(), type: 'story', text: 'New story' });
    return { ...t, items };
  });
}

export function removeStory(model: StoryMap, actIdx: number, taskIdx: number, tier: number, slot: number): StoryMap {
  return updateTask(model, actIdx, taskIdx, t => {
    const idx = storyFlatIndex(t, tier, slot);
    if (idx < 0) return t;
    const items = [...t.items];
    items.splice(idx, 1);
    return { ...t, items };
  });
}

export function renameStory(model: StoryMap, actIdx: number, taskIdx: number, tier: number, slot: number, text: string): StoryMap {
  return updateTask(model, actIdx, taskIdx, t => {
    const idx = storyFlatIndex(t, tier, slot);
    if (idx < 0) return t;
    const items = [...t.items];
    items[idx] = { ...items[idx], type: 'story', text } as typeof items[number];
    return { ...t, items };
  });
}

export function moveStory(
  model: StoryMap,
  fromActIdx: number, fromTaskIdx: number, fromTier: number, fromSlot: number,
  toActIdx: number, toTaskIdx: number, toTier: number, toSlot: number | null
): StoryMap {
  const fromTask = model.activities[fromActIdx].tasks[fromTaskIdx];
  const fromIdx = storyFlatIndex(fromTask, fromTier, fromSlot);
  if (fromIdx < 0) return model;
  const movedItem = fromTask.items[fromIdx];

  const activities = model.activities.map(a => ({ ...a, tasks: a.tasks.map(t => ({ ...t, items: [...t.items] })) }));
  activities[fromActIdx].tasks[fromTaskIdx].items.splice(fromIdx, 1);

  const toTask = activities[toActIdx].tasks[toTaskIdx];
  // Ensure target task has enough separators to reach toTier
  ensureSeparators(toTask, toTier);

  if (toSlot !== null) {
    const toIdx = storyFlatIndex(toTask, toTier, toSlot);
    toTask.items.splice(toIdx >= 0 ? toIdx : tierInsertIndex(toTask, toTier), 0, movedItem);
  } else {
    toTask.items.splice(tierInsertIndex(toTask, toTier), 0, movedItem);
  }
  return { ...model, activities };
}

// ── Releases ──────────────────────────────────────────────────────────────────

export function addReleaseLine(model: StoryMap, afterTier: number): StoryMap {
  // Insert a separator at position afterTier in every task that doesn't already have one there
  const newTier = afterTier + 1;
  const releases = model.releases
    .map(r => r.tier >= newTier ? { ...r, tier: r.tier + 1 } : r)
    .concat({ id: uuidv4(), name: null, tier: newTier });
  releases.sort((a, b) => a.tier - b.tier);

  const activities = model.activities.map(act => ({
    ...act,
    tasks: act.tasks.map(task => {
      const items = [...task.items];
      const sepIdx = separatorIndex(task, afterTier);
      const insertAt = sepIdx >= 0 ? sepIdx : tierInsertIndex(task, afterTier);
      items.splice(insertAt, 0, { id: uuidv4(), type: 'separator' } as TierSeparator);
      return { ...task, items };
    }),
  }));
  return { ...model, releases, activities };
}

export function removeReleaseLine(model: StoryMap, tier: number): StoryMap {
  const releases = model.releases
    .filter(r => r.tier !== tier)
    .map(r => r.tier > tier ? { ...r, tier: r.tier - 1 } : r);

  // Remove the (tier-1)th separator from every task (0-based: tier 1 = separator 0)
  const sepIndex = tier - 1;
  const activities = model.activities.map(act => ({
    ...act,
    tasks: act.tasks.map(task => {
      const idx = separatorIndex(task, sepIndex);
      if (idx < 0) return task;
      const items = [...task.items];
      items.splice(idx, 1);
      return { ...task, items };
    }),
  }));
  return { ...model, releases, activities };
}

export function renameRelease(model: StoryMap, tier: number, name: string | null): StoryMap {
  return { ...model, releases: model.releases.map(r => r.tier === tier ? { ...r, name } : r) };
}

export function moveReleaseLine(model: StoryMap, fromTier: number, toTier: number): StoryMap {
  if (fromTier === toTier) return model;
  const hasCollision = model.releases.some(r => r.tier === toTier);
  const releases = model.releases.map(r => {
    if (r.tier === fromTier) return { ...r, tier: toTier };
    if (hasCollision && r.tier === toTier) return { ...r, tier: fromTier };
    return r;
  });
  releases.sort((a, b) => a.tier - b.tier);
  return { ...model, releases };
}

export function renameTitle(model: StoryMap, title: string | null): StoryMap {
  return { ...model, title };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function updateActivity(model: StoryMap, actIdx: number, fn: (a: Activity) => Activity): StoryMap {
  return { ...model, activities: model.activities.map((a, i) => i === actIdx ? fn(a) : a) };
}

function updateTask(model: StoryMap, actIdx: number, taskIdx: number, fn: (t: Task) => Task): StoryMap {
  return updateActivity(model, actIdx, a => ({ ...a, tasks: a.tasks.map((t, i) => i === taskIdx ? fn(t) : t) }));
}

/** Ensure a task has at least `tier` separators, inserting them at the end if needed. */
function ensureSeparators(task: Task, tier: number): void {
  const existing = task.items.filter(i => i.type === 'separator').length;
  for (let i = existing; i < tier; i++) {
    task.items.push({ id: uuidv4(), type: 'separator' });
  }
}
