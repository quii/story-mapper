import { useRef, useState } from 'react';
import type { StoryMap } from '../../core/types';
import { allTasks, tierCount, tierMaxRows, tierRawIndices, getStoriesForTier, releaseForTier } from '../../core/layout';
import { parseStoryText } from '../../core/storyLink';
import { isStoryDone, toggleStoryDone, storyDisplayText } from '../../core/storyDone';
import {
  addActivity, addReleaseLine, addStory, addTask,
  moveReleaseLine, moveStory, moveTask,
  removeActivity, removeReleaseLine, removeTask, removeStory,
  renameActivity, renameRelease, renameStory, renameTask, renameTitle,
} from '../../core/model';
import { releaseColor } from '../../core/palette';
import { cardTilt } from '../../core/cardTilt';
import { EmptyState } from './EmptyState';
import styles from './Canvas.module.css';

interface Props {
  model: StoryMap;
  onChange: (model: StoryMap) => void;
  onLoadExample: () => void;
  onStartFromScratch: () => void;
}

type DragState =
  | { type: 'task'; actIdx: number; taskIdx: number }
  | { type: 'story'; actIdx: number; taskIdx: number; rawIndex: number; slot: number }
  | null;

const COL_W = 190;
const BTN_W = 32;

export function Canvas({ model, onChange, onLoadExample, onStartFromScratch }: Props) {
  const dragRef = useRef<DragState>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const modelRef = useRef(model);
  const onChangeRef = useRef(onChange);
  modelRef.current = model;
  onChangeRef.current = onChange;

  const { activities, releases } = model;
  const hasContent = activities.length > 0;
  const flatTasks = allTasks(activities);
  const numTiers = tierCount(activities, releases);
  const maxRows = tierMaxRows(activities, releases);
  // Visible (compact) tier index -> raw items-array index shared by every task.
  const rawIndices = tierRawIndices(activities, releases);

  // ── Task drag ──────────────────────────────────────────────────────────────
  const onTaskDragStart = (e: React.DragEvent, actIdx: number, taskIdx: number) => {
    dragRef.current = { type: 'task', actIdx, taskIdx };
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };
  const onTaskDragOver = (e: React.DragEvent, key: string) => {
    if (dragRef.current?.type !== 'task') return;
    e.preventDefault();
    setDragOver(key);
  };
  const onTaskDrop = (e: React.DragEvent, toActIdx: number, toTaskIdx: number) => {
    e.preventDefault();
    setDragOver(null);
    if (dragRef.current?.type !== 'task') return;
    const { actIdx: fromAct, taskIdx: fromTask } = dragRef.current;
    dragRef.current = null;
    onChange(moveTask(model, fromAct, fromTask, toActIdx, toTaskIdx));
  };

  // ── Story drag ─────────────────────────────────────────────────────────────
  const onStoryDragStart = (e: React.DragEvent, actIdx: number, taskIdx: number, rawIndex: number, slot: number) => {
    dragRef.current = { type: 'story', actIdx, taskIdx, rawIndex, slot };
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };
  const onCellDragOver = (e: React.DragEvent, key: string) => {
    if (dragRef.current?.type !== 'story') return;
    e.preventDefault();
    setDragOver(key);
  };
  const onCellDrop = (e: React.DragEvent, toActIdx: number, toTaskIdx: number, toRawIndex: number, toSlot: number | null, hasStory: boolean) => {
    e.preventDefault();
    setDragOver(null);
    if (dragRef.current?.type !== 'story') return;
    const { actIdx: fAi, taskIdx: fTi, rawIndex: fRawIndex, slot: fSlot } = dragRef.current;
    dragRef.current = null;
    onChange(moveStory(model, fAi, fTi, fRawIndex, fSlot, toActIdx, toTaskIdx, toRawIndex, hasStory ? toSlot : null));
  };

  // ── Release drag ───────────────────────────────────────────────────────────
  const ghostRef = useRef<HTMLDivElement>(null);
  const relDragRef = useRef<{ tier: number } | null>(null);
  const relDragOverRef = useRef<string | null>(null);
  const [relDragActive, setRelDragActive] = useState(false);
  const [relDragOver, setRelDragOver] = useState<string | null>(null);

  const onRelGripPointerDown = (e: React.PointerEvent, tier: number) => {
    e.preventDefault();
    relDragRef.current = { tier };
    relDragOverRef.current = null;
    setRelDragActive(true);
    setRelDragOver(null);

    const onMove = (ev: PointerEvent) => {
      if (!ghostRef.current) return;
      ghostRef.current.style.left = ev.clientX + 12 + 'px';
      ghostRef.current.style.top = ev.clientY - 10 + 'px';
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const band = el?.closest('[data-release-tier]');
      const tierAttr = band?.getAttribute('data-release-tier') ?? null;
      const key = tierAttr ? `release-${tierAttr}` : null;
      relDragOverRef.current = key;
      setRelDragOver(key);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      relDragRef.current = null;
      setRelDragActive(false);
      const key = relDragOverRef.current;
      relDragOverRef.current = null;
      setRelDragOver(null);
      if (key?.startsWith('release-')) {
        const toTier = parseInt(key.replace('release-', ''), 10);
        if (toTier !== tier) onChangeRef.current(moveReleaseLine(modelRef.current, tier, toTier));
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!hasContent) {
    return <EmptyState onLoadExample={onLoadExample} onStartFromScratch={onStartFromScratch} />;
  }

  // Build grid column template
  const colTemplate: string[] = [];
  const actStart: number[] = [];
  let col = 1;
  activities.forEach((act) => {
    actStart.push(col);
    const tc = Math.max(act.tasks.length, 1);
    for (let i = 0; i < tc; i++) colTemplate.push(`${COL_W}px`);
    colTemplate.push(`${BTN_W}px`);
    col += tc + 1;
  });
  colTemplate.push('auto');
  const gridTemplateColumns = colTemplate.join(' ');

  let taskColCursor = 1;
  const taskGridCols: number[] = [];
  activities.forEach((act) => {
    const tc = Math.max(act.tasks.length, 1);
    for (let i = 0; i < tc; i++) taskGridCols.push(taskColCursor + i);
    taskColCursor += tc + 1;
  });

  return (
    <div className={styles.canvas}>
      <div ref={ghostRef} className={styles.releaseGhost} style={{ display: relDragActive ? 'block' : 'none' }}>release</div>

      {model.title !== null && (
        <div
          className={styles.mapTitle}
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          onBlur={(e) => onChange(renameTitle(model, e.currentTarget.textContent?.trim() || null))}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        >
          {model.title}
        </div>
      )}

      <div className={`${styles.grid} ${relDragActive ? styles.relDragActive : ''}`} style={{ gridTemplateColumns }}>

        {/* Activity cards */}
        {activities.map((act, ai) => {
          const tc = Math.max(act.tasks.length, 1);
          return (
            <div key={act.id} className={styles.activityCard} style={{ gridColumn: `${actStart[ai]} / span ${tc + 1}`, gridRow: 1 }}>
              <div className={styles.activityName} contentEditable="plaintext-only" suppressContentEditableWarning
                onBlur={(e) => onChange(renameActivity(model, ai, e.currentTarget.textContent?.trim() ?? act.name))}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}>{act.name}</div>
              <button className={styles.removeBtn} aria-label={`Remove activity ${act.name}`} onClick={() => onChange(removeActivity(model, ai))}>×</button>
            </div>
          );
        })}
        <div className={styles.addActivityCell} style={{ gridRow: '1 / span 2' }}>
          <button className={styles.addActivityBtn} aria-label="Add activity" onClick={() => onChange(addActivity(model))}>+ activity</button>
        </div>

        {/* Task cells */}
        {flatTasks.map(({ task, actIdx, taskIdx }, colIdx) => {
          const isPhantom = activities[actIdx].tasks.length === 0;
          const taskKey = `task-${colIdx}`;
          return (
            <div key={task.id}
              className={`${styles.taskCell} ${isPhantom ? styles.phantomTask : ''} ${dragOver === taskKey ? styles.dragOverTask : ''}`}
              style={{ gridColumn: taskGridCols[colIdx], gridRow: 2 }}
              draggable={!isPhantom}
              onDragStart={!isPhantom ? (e) => onTaskDragStart(e, actIdx, taskIdx) : undefined}
              onDragOver={!isPhantom ? (e) => onTaskDragOver(e, taskKey) : undefined}
              onDragLeave={() => setDragOver(null)}
              onDrop={!isPhantom ? (e) => onTaskDrop(e, actIdx, taskIdx) : undefined}
              onDragEnd={() => { dragRef.current = null; setDragOver(null); }}
            >
              {!isPhantom && (<>
                <div className={styles.taskName} contentEditable="plaintext-only" suppressContentEditableWarning
                  onBlur={(e) => onChange(renameTask(model, actIdx, taskIdx, e.currentTarget.textContent?.trim() ?? task.name))}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}>{task.name}</div>
                <button className={styles.removeBtn} aria-label={`Remove task ${task.name}`} onClick={() => onChange(removeTask(model, actIdx, taskIdx))}>×</button>
              </>)}
            </div>
          );
        })}
        {activities.map((act, ai) => {
          const tc = Math.max(act.tasks.length, 1);
          return (
            <div key={`add-task-${ai}`} className={styles.addTaskCell} style={{ gridColumn: actStart[ai] + tc, gridRow: 2 }}>
              <button className={styles.addTaskBtn} aria-label={`Add task to ${act.name}`} onClick={() => onChange(addTask(model, ai))}>+</button>
            </div>
          );
        })}

        {/* Story tiers */}
        {Array.from({ length: numTiers }, (_, tier) => {
          const rows = maxRows[tier] ?? 0;
          const release = releaseForTier(releases, tier);

          return (
            <div key={`tier-${tier}`} style={{ display: 'contents' }}>
              {Array.from({ length: rows }, (_, slot) => (
                <div key={`slot-${slot}`} style={{ display: 'contents' }}>
                  {flatTasks.map(({ task, actIdx, taskIdx }, colIdx) => {
                    const rawIndex = rawIndices[tier];
                    const tierStories = getStoriesForTier(task, rawIndex);
                    const story = tierStories[slot];
                    const cellKey = `cell-${colIdx}-${tier}-${slot}`;
                    return (
                      <div key={cellKey}
                        className={`${styles.storyCell} ${dragOver === cellKey ? styles.dragOverCell : ''}`}
                        style={{ gridColumn: taskGridCols[colIdx] }}
                        onDragOver={(e) => onCellDragOver(e, cellKey)}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={(e) => onCellDrop(e, actIdx, taskIdx, rawIndex, slot, !!story)}
                      >
                        {story && (() => {
                          const done = isStoryDone(story.text);
                          const rawWithoutDone = storyDisplayText(story.text);
                          const { display, link } = parseStoryText(rawWithoutDone);
                          const linkSuffix = rawWithoutDone.slice(display.length);
                          const donePrefix = done ? '~' : '';
                          const onStoryBlur = (e: React.FocusEvent<HTMLDivElement>) => {
                            const newDisplay = e.currentTarget.textContent?.trim() ?? display;
                            onChange(renameStory(model, actIdx, taskIdx, rawIndex, slot, donePrefix + newDisplay + linkSuffix));
                          };
                          return (
                            <div className={`${styles.storyCard} ${done ? styles.storyCardDone : ''}`}
                              style={{ '--tilt': `${cardTilt(story.id)}deg` } as React.CSSProperties}
                              draggable
                              onDragStart={(e) => onStoryDragStart(e, actIdx, taskIdx, rawIndex, slot)}
                              onDragEnd={() => { dragRef.current = null; setDragOver(null); }}
                            >
                              <button
                                className={`${styles.storyDoneBtn} ${done ? styles.storyDoneBtnDone : ''}`}
                                onClick={(e) => { e.stopPropagation(); onChange(renameStory(model, actIdx, taskIdx, rawIndex, slot, toggleStoryDone(story.text))); }}
                                aria-label={done ? 'Mark incomplete' : 'Mark done'}
                              >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" fill={done ? 'currentColor' : 'none'} />
                                  {done && <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
                                </svg>
                              </button>
                              <div className={styles.storyContent}>
                                <div className={`${styles.storyText} ${done ? styles.storyTextDone : ''}`}
                                  contentEditable="plaintext-only" suppressContentEditableWarning
                                  onBlur={onStoryBlur}
                                  onKeyDown={(e) => !e.shiftKey && e.key === 'Enter' && e.currentTarget.blur()}
                                >{display}</div>
                                {link && (
                                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                                    className={styles.storyLink} title={link.url}
                                    onClick={(e) => e.stopPropagation()}
                                  >{link.label}</a>
                                )}
                              </div>
                              <button className={styles.removeStoryBtn} aria-label={`Remove story: ${display}`}
                                onClick={() => onChange(removeStory(model, actIdx, taskIdx, rawIndex, slot))}>×</button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* + story row */}
              {flatTasks.map(({ actIdx, taskIdx }, colIdx) => (
                <div key={`add-${colIdx}-${tier}`} className={styles.addStoryCell} style={{ gridColumn: taskGridCols[colIdx] }}>
                  <button className={styles.addStoryBtn} onClick={() => onChange(addStory(model, actIdx, taskIdx, rawIndices[tier]))} aria-label="Add story">+</button>
                </div>
              ))}

              {/* Release band or empty slot after tier */}
              {(() => {
                const isDragOver = relDragOver === `release-${tier + 1}`;
                const isLastTier = tier === numTiers - 1;

                if (release) {
                  return (
                    <div data-release-tier={release.tier}
                      className={`${styles.releaseBand} ${isDragOver ? styles.relDragOver : ''}`}
                      style={{ gridColumn: '1 / -1', '--release-color': releaseColor(tier) } as React.CSSProperties}
                    >
                      <span className={styles.releaseGrip} onPointerDown={(e) => onRelGripPointerDown(e, release.tier)} role="button" aria-label={`Drag release ${release.name ?? tier + 1}`}>⠿</span>
                      <span className={styles.releaseLabel} style={{ background: releaseColor(tier) }}
                        contentEditable="plaintext-only" suppressContentEditableWarning
                        onBlur={(e) => onChange(renameRelease(model, release.tier, e.currentTarget.textContent?.trim() || null))}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        role="textbox" aria-label="Release name"
                      >{release.name ?? ''}</span>
                      <div className={styles.releaseLine} style={{ background: releaseColor(tier) }} />
                      <button className={styles.removeReleaseBtn} onClick={() => onChange(removeReleaseLine(model, release.tier))} aria-label={`Remove release ${release.name ?? tier + 1}`}>×</button>
                    </div>
                  );
                }

                if (isLastTier) return null;

                return (
                  <div data-release-tier={tier + 1}
                    className={`${styles.releaseSlot} ${isDragOver ? styles.releaseSlotOver : ''}`}
                    style={{ gridColumn: '1 / -1' }}
                  />
                );
              })()}
            </div>
          );
        })}

        {/* Add story + add release after last tier */}
        {flatTasks.map(({ actIdx, taskIdx }, colIdx) => (
          <div key={`add-story-last-${colIdx}`} className={styles.addStoryCell} style={{ gridColumn: taskGridCols[colIdx] }}>
            <button className={styles.addStoryBtn} onClick={() => onChange(addStory(model, actIdx, taskIdx, rawIndices[numTiers - 1]))} aria-label="Add story">+</button>
          </div>
        ))}

        <div data-release-tier={numTiers}
          className={`${styles.releaseSlot} ${styles.releaseSlotFinal} ${relDragOver === `release-${numTiers}` ? styles.releaseSlotOver : ''}`}
          style={{ gridColumn: '1 / -1' }}
        >
          <button className={styles.addReleaseBtn} onClick={() => onChange(addReleaseLine(model, numTiers - 1))}>+ release</button>
        </div>
      </div>
    </div>
  );
}
