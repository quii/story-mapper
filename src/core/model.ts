import { v4 as uuidv4 } from 'uuid';
import type { Activity, Item, StoryMap, Task } from './types';
import { storyFlatIndex } from './layout';

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
    padToRow(items, tier);
    items.splice(tier, 0, { id: uuidv4(), type: 'story', text: 'New story' });
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
  const sameTask = fromActIdx === toActIdx && fromTaskIdx === toTaskIdx;
  const target = sameTask && fromIdx < toTier ? toTier - 1 : toTier;

  if (toSlot !== null) {
    // Dropping onto a row that already holds a story: insert before it, pushing it (and everything after) down a row.
    padToRow(toTask.items, target);
    toTask.items.splice(target, 0, movedItem);
  } else {
    // Dropping onto an empty row: occupy it directly, replacing any separator padding already there.
    padToRow(toTask.items, target);
    if (toTask.items.length === target) toTask.items.push(movedItem);
    else toTask.items[target] = movedItem;
  }
  return { ...model, activities };
}

// ── Releases ──────────────────────────────────────────────────────────────────

export function addReleaseLine(model: StoryMap, afterTier: number): StoryMap {
  // A release line is just a label on a physical row — it doesn't touch any task's items.
  const newTier = afterTier + 1;
  const releases = [...model.releases, { id: uuidv4(), name: null, tier: newTier }];
  releases.sort((a, b) => a.tier - b.tier);
  return { ...model, releases };
}

export function removeReleaseLine(model: StoryMap, tier: number): StoryMap {
  return { ...model, releases: model.releases.filter(r => r.tier !== tier) };
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

/** Pad an items array with blank separator rows until it has exactly `row` items. */
function padToRow(items: Item[], row: number): void {
  while (items.length < row) items.push({ id: uuidv4(), type: 'separator' });
}
