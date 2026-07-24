import { v4 as uuidv4 } from 'uuid';
import type { Activity, StoryMap, Task } from './types';

// ── Activities ────────────────────────────────────────────────────────────────

export function addActivity(model: StoryMap): StoryMap {
  const newAct: Activity = { id: uuidv4(), name: 'New activity', tasks: [] };
  return { ...model, activities: [...model.activities, newAct] };
}

export function removeActivity(model: StoryMap, actIdx: number): StoryMap {
  return { ...model, activities: model.activities.filter((_, i) => i !== actIdx) };
}

export function renameActivity(model: StoryMap, actIdx: number, name: string): StoryMap {
  return updateActivity(model, actIdx, (a) => ({ ...a, name }));
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function addTask(model: StoryMap, actIdx: number): StoryMap {
  const newTask: Task = { id: uuidv4(), name: 'New task', stories: [] };
  return updateActivity(model, actIdx, (a) => ({ ...a, tasks: [...a.tasks, newTask] }));
}

export function removeTask(model: StoryMap, actIdx: number, taskIdx: number): StoryMap {
  return updateActivity(model, actIdx, (a) => ({
    ...a,
    tasks: a.tasks.filter((_, i) => i !== taskIdx),
  }));
}

export function renameTask(model: StoryMap, actIdx: number, taskIdx: number, name: string): StoryMap {
  return updateTask(model, actIdx, taskIdx, (t) => ({ ...t, name }));
}

export function moveTask(
  model: StoryMap,
  fromActIdx: number,
  fromTaskIdx: number,
  toActIdx: number,
  toTaskIdx: number
): StoryMap {
  if (fromActIdx === toActIdx && fromTaskIdx === toTaskIdx) return model;
  const activities = model.activities.map((a) => ({ ...a, tasks: [...a.tasks] }));
  const task = activities[fromActIdx].tasks[fromTaskIdx];
  activities[fromActIdx].tasks.splice(fromTaskIdx, 1);
  activities[toActIdx].tasks.splice(toTaskIdx, 0, task);
  return { ...model, activities };
}

// ── Stories ───────────────────────────────────────────────────────────────────
// Stories are stored flat; `row` is the 0-based absolute grid row.

export function addStory(model: StoryMap, actIdx: number, taskIdx: number, row: number): StoryMap {
  return updateTask(model, actIdx, taskIdx, (t) => {
    const stories = [...t.stories];
    // Insert at the given row position (appends if row >= stories.length)
    const insertAt = Math.min(row, stories.length);
    stories.splice(insertAt, 0, { id: uuidv4(), type: 'story', text: 'New story' });
    return { ...t, stories };
  });
}

export function removeStory(model: StoryMap, actIdx: number, taskIdx: number, row: number): StoryMap {
  return updateTask(model, actIdx, taskIdx, (t) => {
    if (row < 0 || row >= t.stories.length) return t;
    const stories = [...t.stories];
    stories.splice(row, 1);
    return { ...t, stories };
  });
}

export function renameStory(
  model: StoryMap,
  actIdx: number,
  taskIdx: number,
  row: number,
  text: string
): StoryMap {
  return updateTask(model, actIdx, taskIdx, (t) => {
    if (row < 0 || row >= t.stories.length) return t;
    const stories = [...t.stories];
    stories[row] = { ...stories[row], text };
    return { ...t, stories };
  });
}

export function moveStory(
  model: StoryMap,
  fromActIdx: number,
  fromTaskIdx: number,
  fromRow: number,
  toActIdx: number,
  toTaskIdx: number,
  toRow: number
): StoryMap {
  const fromTask = model.activities[fromActIdx].tasks[fromTaskIdx];
  if (fromRow < 0 || fromRow >= fromTask.stories.length) return model;
  const movedItem = fromTask.stories[fromRow];

  const activities = model.activities.map((a) => ({
    ...a,
    tasks: a.tasks.map((t) => ({ ...t, stories: [...t.stories] })),
  }));

  activities[fromActIdx].tasks[fromTaskIdx].stories.splice(fromRow, 1);

  const toTask = activities[toActIdx].tasks[toTaskIdx];
  const insertAt = Math.min(toRow, toTask.stories.length);
  toTask.stories.splice(insertAt, 0, movedItem);

  return { ...model, activities };
}

// ── Releases ──────────────────────────────────────────────────────────────────

export function addReleaseLine(model: StoryMap, afterRow: number): StoryMap {
  // afterRow is 0-based; release.tier is 1-based
  const newTier = afterRow + 1;
  // Shift any existing releases at this tier or higher
  const releases = model.releases
    .map((r) => (r.tier >= newTier ? { ...r, tier: r.tier + 1 } : r))
    .concat({ id: uuidv4(), name: null, tier: newTier });
  releases.sort((a, b) => a.tier - b.tier);
  return { ...model, releases };
}

export function removeReleaseLine(model: StoryMap, tier: number): StoryMap {
  const releases = model.releases
    .filter((r) => r.tier !== tier)
    .map((r) => (r.tier > tier ? { ...r, tier: r.tier - 1 } : r));
  return { ...model, releases };
}

export function renameRelease(model: StoryMap, tier: number, name: string | null): StoryMap {
  return { ...model, releases: model.releases.map((r) => (r.tier === tier ? { ...r, name } : r)) };
}

export function moveReleaseLine(model: StoryMap, fromTier: number, toTier: number): StoryMap {
  if (fromTier === toTier) return model;
  // toTier is the absolute row position (1-based) to move the release to.
  // If a release already sits at toTier, swap them.
  const hasCollision = model.releases.some((r) => r.tier === toTier);
  const releases = model.releases.map((r) => {
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
  return { ...model, activities: model.activities.map((a, i) => (i === actIdx ? fn(a) : a)) };
}

function updateTask(model: StoryMap, actIdx: number, taskIdx: number, fn: (t: Task) => Task): StoryMap {
  return updateActivity(model, actIdx, (a) => ({
    ...a,
    tasks: a.tasks.map((t, i) => (i === taskIdx ? fn(t) : t)),
  }));
}
