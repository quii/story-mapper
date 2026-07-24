import { useRef, useState } from 'react';
import type { StoryMap } from '../../core/types';
import { allTasks, releaseAfterRow, storyAtRow, totalRows } from '../../core/layout';
import { parseStoryText } from '../../core/storyLink';
import {
  addActivity, addReleaseLine, addStory, addTask,
  moveReleaseLine, moveStory, moveTask,
  removeActivity, removeReleaseLine, removeTask, removeStory,
  renameActivity, renameRelease, renameStory, renameTask, renameTitle,
} from '../../core/model';
import { releaseColor } from '../../core/palette';
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
  | { type: 'story'; actIdx: number; taskIdx: number; row: number }
  | null;

const COL_W = 160;
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
  const numRows = totalRows(activities, releases);

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
  const onStoryDragStart = (e: React.DragEvent, actIdx: number, taskIdx: number, row: number) => {
    dragRef.current = { type: 'story', actIdx, taskIdx, row };
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };
  const onCellDragOver = (e: React.DragEvent, key: string) => {
    if (dragRef.current?.type !== 'story') return;
    e.preventDefault();
    setDragOver(key);
  };
  const onCellDrop = (e: React.DragEvent, toActIdx: number, toTaskIdx: number, toRow: number) => {
    e.preventDefault();
    setDragOver(null);
    if (dragRef.current?.type !== 'story') return;
    const { actIdx: fAi, taskIdx: fTi, row: fRow } = dragRef.current;
    dragRef.current = null;
    onChange(moveStory(model, fAi, fTi, fRow, toActIdx, toTaskIdx, toRow));
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

  /**
   * Single unified grid.
   *
   * Column layout: for each activity, N task columns (160px) + 1 button column (BTN_W px).
   * Then one final "add activity" column.
   *
   * Example with activities [2 tasks, 1 task]:
   *   160px 160px 32px | 160px 32px | auto
   *   col 1  col 2  col3  col4  col5  col6
   *
   * Activity cards span their task columns + button column.
   * Task cells each occupy one 160px column.
   * + task button occupies the 32px column.
   * Story cells occupy only the 160px task columns (not the button columns).
   * Release bands span all columns via `1 / -1`.
   */

  // Build column template and record where each activity starts (1-based)
  const colTemplate: string[] = [];
  const actStart: number[] = []; // 1-based grid column where each activity's tasks begin

  let col = 1;
  activities.forEach((act) => {
    actStart.push(col);
    const tc = Math.max(act.tasks.length, 1);
    for (let i = 0; i < tc; i++) colTemplate.push(`${COL_W}px`);
    colTemplate.push(`${BTN_W}px`); // button column
    col += tc + 1;
  });
  colTemplate.push('auto'); // + activity column
  const gridTemplateColumns = colTemplate.join(' ');

  // For each flat task, its grid column
  let taskColCursor = 1;
  const taskGridCols: number[] = [];
  activities.forEach((act) => {
    const tc = Math.max(act.tasks.length, 1);
    for (let i = 0; i < tc; i++) {
      taskGridCols.push(taskColCursor + i);
    }
    taskColCursor += tc + 1; // skip button column
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

      <div
        className={`${styles.grid} ${relDragActive ? styles.relDragActive : ''}`}
        style={{ gridTemplateColumns }}
      >
        {/* ── Row 1: Activity cards ── */}
        {activities.map((act, ai) => {
          const tc = Math.max(act.tasks.length, 1);
          const start = actStart[ai];
          // span: tc task cols + 1 button col
          return (
            <div
              key={act.id}
              className={styles.activityCard}
              style={{ gridColumn: `${start} / span ${tc + 1}`, gridRow: 1 }}
            >
              <div
                className={styles.activityName}
                contentEditable="plaintext-only"
                suppressContentEditableWarning
                onBlur={(e) => onChange(renameActivity(model, ai, e.currentTarget.textContent?.trim() ?? act.name))}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              >
                {act.name}
              </div>
              <button className={styles.removeBtn} aria-label={`Remove activity ${act.name}`} onClick={() => onChange(removeActivity(model, ai))}>×</button>
            </div>
          );
        })}

        {/* + activity button in the last column */}
        <div className={styles.addActivityCell} style={{ gridRow: '1 / span 2' }}>
          <button className={styles.addActivityBtn} aria-label="Add activity" onClick={() => onChange(addActivity(model))}>+ activity</button>
        </div>

        {/* ── Row 2: Task cells + add-task buttons ── */}
        {flatTasks.map(({ task, actIdx, taskIdx }, colIdx) => {
          const isPhantom = activities[actIdx].tasks.length === 0;
          const taskKey = `task-${colIdx}`;
          const gridCol = taskGridCols[colIdx];
          return (
            <div
              key={task.id}
              className={`${styles.taskCell} ${isPhantom ? styles.phantomTask : ''} ${dragOver === taskKey ? styles.dragOverTask : ''}`}
              style={{ gridColumn: gridCol, gridRow: 2 }}
              draggable={!isPhantom}
              onDragStart={!isPhantom ? (e) => onTaskDragStart(e, actIdx, taskIdx) : undefined}
              onDragOver={!isPhantom ? (e) => onTaskDragOver(e, taskKey) : undefined}
              onDragLeave={() => setDragOver(null)}
              onDrop={!isPhantom ? (e) => onTaskDrop(e, actIdx, taskIdx) : undefined}
              onDragEnd={() => { dragRef.current = null; setDragOver(null); }}
            >
              {!isPhantom && (
                <>
                  <div
                    className={styles.taskName}
                    contentEditable="plaintext-only"
                    suppressContentEditableWarning
                    onBlur={(e) => onChange(renameTask(model, actIdx, taskIdx, e.currentTarget.textContent?.trim() ?? task.name))}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  >
                    {task.name}
                  </div>
                  <button className={styles.removeBtn} aria-label={`Remove task ${task.name}`} onClick={() => onChange(removeTask(model, actIdx, taskIdx))}>×</button>
                </>
              )}
            </div>
          );
        })}

        {/* + task buttons: one per activity, in the button column */}
        {activities.map((act, ai) => {
          const tc = Math.max(act.tasks.length, 1);
          const btnCol = actStart[ai] + tc; // the 32px button column
          return (
            <div key={`add-task-${ai}`} className={styles.addTaskCell} style={{ gridColumn: btnCol, gridRow: 2 }}>
              <button
                className={styles.addTaskBtn}
                aria-label={`Add task to ${act.name}`}
                onClick={() => onChange(addTask(model, ai))}
              >+</button>
            </div>
          );
        })}

        {/* ── Story rows ── */}
        {Array.from({ length: numRows }, (_, row) => {
          const release = releaseAfterRow(releases, row);
          const tier = row + 1;
          return (
            <div key={`row-${row}`} style={{ display: 'contents' }}>
              {flatTasks.map(({ task, actIdx, taskIdx }, colIdx) => {
                const story = storyAtRow(task, row);
                const cellKey = `cell-${colIdx}-${row}`;
                return (
                  <div
                    key={cellKey}
                    className={`${styles.storyCell} ${dragOver === cellKey ? styles.dragOverCell : ''}`}
                    style={{ gridColumn: taskGridCols[colIdx] }}
                    onDragOver={(e) => onCellDragOver(e, cellKey)}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => onCellDrop(e, actIdx, taskIdx, row)}
                  >
                    {story && (() => {
                      const { display, link } = parseStoryText(story.text);
                      // Reconstruct raw text from edited display + preserved link suffix
                      const linkSuffix = story.text.slice(display.length);
                      const onStoryBlur = (e: React.FocusEvent<HTMLDivElement>) => {
                        const newDisplay = e.currentTarget.textContent?.trim() ?? display;
                        onChange(renameStory(model, actIdx, taskIdx, row, newDisplay + linkSuffix));
                      };
                      return (
                        <div
                          className={styles.storyCard}
                          draggable
                          onDragStart={(e) => onStoryDragStart(e, actIdx, taskIdx, row)}
                          onDragEnd={() => { dragRef.current = null; setDragOver(null); }}
                        >
                          <div className={styles.storyContent}>
                            <div
                              className={styles.storyText}
                              contentEditable="plaintext-only"
                              suppressContentEditableWarning
                              onBlur={onStoryBlur}
                              onKeyDown={(e) => !e.shiftKey && e.key === 'Enter' && e.currentTarget.blur()}
                            >
                              {display}
                            </div>
                            {link && (
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.storyLink}
                                title={link.url}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {link.label}
                              </a>
                            )}
                          </div>
                          <button
                            className={styles.removeStoryBtn}
                            aria-label={`Remove story: ${display}`}
                            onClick={() => onChange(removeStory(model, actIdx, taskIdx, row))}
                          >×</button>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {/* Release slot after every row */}
              {(() => {
                const isDragOver = relDragOver === `release-${tier}`;
                const isLast = row === numRows - 1;
                if (release) {
                  return (
                    <div
                      data-release-tier={release.tier}
                      className={`${styles.releaseBand} ${isDragOver ? styles.relDragOver : ''}`}
                      style={{ gridColumn: `1 / -1`, '--release-color': releaseColor(release.tier - 1) } as React.CSSProperties}
                    >
                      <span className={styles.releaseGrip} onPointerDown={(e) => onRelGripPointerDown(e, release.tier)} role="button" aria-label={`Drag release line ${release.name ?? release.tier}`}>⠿</span>
                      <span
                        className={styles.releaseLabel}
                        style={{ background: releaseColor(release.tier - 1) }}
                        contentEditable="plaintext-only"
                        suppressContentEditableWarning
                        onBlur={(e) => onChange(renameRelease(model, release.tier, e.currentTarget.textContent?.trim() || null))}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        role="textbox"
                        aria-label="Release name"
                      >{release.name ?? ''}</span>
                      <div className={styles.releaseLine} style={{ background: releaseColor(release.tier - 1) }} />
                      <button className={styles.removeReleaseBtn} onClick={() => onChange(removeReleaseLine(model, release.tier))} aria-label={`Remove release ${release.name ?? release.tier}`}>×</button>
                    </div>
                  );
                }
                if (isLast) return null;
                return (
                  <div
                    data-release-tier={tier}
                    className={`${styles.releaseSlot} ${isDragOver ? styles.releaseSlotOver : ''}`}
                    style={{ gridColumn: '1 / -1' }}
                  />
                );
              })()}
            </div>
          );
        })}

        {/* + story buttons */}
        {flatTasks.map(({ actIdx, taskIdx }, colIdx) => (
          <div key={`add-story-${colIdx}`} className={styles.addStoryCell} style={{ gridColumn: taskGridCols[colIdx] }}>
            <button className={styles.addStoryBtn} onClick={() => onChange(addStory(model, actIdx, taskIdx, numRows))} aria-label="Add story">+</button>
          </div>
        ))}

        {/* Final release drop zone */}
        <div
          data-release-tier={numRows}
          className={`${styles.releaseSlot} ${styles.releaseSlotFinal} ${relDragOver === `release-${numRows}` ? styles.releaseSlotOver : ''}`}
          style={{ gridColumn: '1 / -1' }}
        >
          <button className={styles.addReleaseBtn} onClick={() => onChange(addReleaseLine(model, numRows - 1))}>+ release</button>
        </div>
      </div>
    </div>
  );
}
