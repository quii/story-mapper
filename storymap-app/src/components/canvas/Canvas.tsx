import { useRef, useState } from 'react';
import type { StoryMap } from '../../core/types';
import { allTasks, releaseAfterRow, storyAtRow, totalRows } from '../../core/layout';
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
const GAP = 4;

export function Canvas({ model, onChange, onLoadExample, onStartFromScratch }: Props) {
  const dragRef = useRef<DragState>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Keep refs to model and onChange so window-level event handlers
  // always access the current values, not stale closure snapshots.
  const modelRef = useRef(model);
  const onChangeRef = useRef(onChange);
  modelRef.current = model;
  onChangeRef.current = onChange;

  const { activities, releases } = model;
  const hasContent = activities.length > 0;
  const flatTasks = allTasks(activities);
  const numCols = flatTasks.length;
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
  // We use window-level pointermove/pointerup so the drag works anywhere on screen.
  // No pointer capture — that prevents elementFromPoint from seeing other elements.
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

  const gridCols = `repeat(${numCols}, ${COL_W}px) max-content`;

  let colCursor = 1;
  const activitySpans = activities.map((act) => {
    const span = Math.max(act.tasks.length, 1);
    const start = colCursor;
    colCursor += span;
    return { start, span };
  });

  return (
    <div className={styles.canvas}>
      <div
        ref={ghostRef}
        className={styles.releaseGhost}
        style={{ display: relDragActive ? 'block' : 'none' }}
      >release</div>

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

      <div className={`${styles.grid} ${relDragActive ? styles.relDragActive : ''}`} style={{ gridTemplateColumns: gridCols }}>

        {/* ── Activity row ── */}
        {activities.map((act, ai) => {
          const { start, span } = activitySpans[ai];
          return (
            <div key={act.id} className={styles.activityCell} style={{ gridColumn: `${start} / span ${span}` }}>
              <div className={styles.activityCard} style={{ width: span * COL_W + (span - 1) * GAP }}>
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
            </div>
          );
        })}
        <div className={styles.addActivityCell} style={{ gridColumn: numCols + 1 }}>
          <button className={styles.addActivityBtn} aria-label="Add activity" onClick={() => onChange(addActivity(model))}>+ activity</button>
        </div>

        {/* ── Task row ── */}
        {flatTasks.map(({ task, actIdx, taskIdx }, colIdx) => {
          const isPhantom = activities[actIdx].tasks.length === 0;
          const taskKey = `task-${colIdx}`;
          return (
            <div
              key={task.id}
              className={`${styles.taskCell} ${isPhantom ? styles.phantomTask : ''} ${dragOver === taskKey ? styles.dragOverTask : ''}`}
              style={{ gridColumn: colIdx + 1 }}
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
        {activities.map((act, ai) => {
          const { start, span } = activitySpans[ai];
          return (
            <div key={`add-task-${ai}`} className={styles.addTaskCell} style={{ gridColumn: start + span }}>
              <button className={styles.addTaskBtn} aria-label={`Add task to ${act.name}`} onClick={() => onChange(addTask(model, ai))}>+ task</button>
            </div>
          );
        })}

        {/* ── Story rows ── */}
        {Array.from({ length: numRows }, (_, row) => {
          const release = releaseAfterRow(releases, row);
          return (
            <div key={`row-${row}`} style={{ display: 'contents' }}>
              {/* Story cells for this row */}
              {flatTasks.map(({ task, actIdx, taskIdx }, colIdx) => {
                const story = storyAtRow(task, row);
                const cellKey = `cell-${colIdx}-${row}`;
                return (
                  <div
                    key={cellKey}
                    className={`${styles.storyCell} ${dragOver === cellKey ? styles.dragOverCell : ''}`}
                    style={{ gridColumn: colIdx + 1 }}
                    onDragOver={(e) => onCellDragOver(e, cellKey)}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => onCellDrop(e, actIdx, taskIdx, row)}
                  >
                    {story && (
                      <div
                        className={styles.storyCard}
                        draggable
                        onDragStart={(e) => onStoryDragStart(e, actIdx, taskIdx, row)}
                        onDragEnd={() => { dragRef.current = null; setDragOver(null); }}
                      >
                        <div
                          className={styles.storyText}
                          contentEditable="plaintext-only"
                          suppressContentEditableWarning
                          onBlur={(e) => onChange(renameStory(model, actIdx, taskIdx, row, e.currentTarget.textContent?.trim() ?? story.text))}
                          onKeyDown={(e) => !e.shiftKey && e.key === 'Enter' && e.currentTarget.blur()}
                        >
                          {story.text}
                        </div>
                        <button
                          className={styles.removeStoryBtn}
                          aria-label={`Remove story: ${story.text}`}
                          onClick={() => onChange(removeStory(model, actIdx, taskIdx, row))}
                        >×</button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Release slot — always rendered after every row.
                  When a release exists here: full band with grip/label/line.
                  When empty: a thin invisible drop zone that grows during drag. */}
              {(() => {
                const tier = row + 1; // tier is 1-based = row + 1
                const isLast = row === numRows - 1;
                const isDragOver = relDragOver === `release-${tier}`;

                if (release) {
                  return (
                    <div
                      data-release-tier={release.tier}
                      className={`${styles.releaseBand} ${isDragOver ? styles.relDragOver : ''}`}
                      style={{ gridColumn: `1 / ${numCols + 2}`, '--release-color': releaseColor(release.tier - 1) } as React.CSSProperties}
                    >
                      <span
                        className={styles.releaseGrip}
                        onPointerDown={(e) => onRelGripPointerDown(e, release.tier)}
                        role="button"
                        aria-label={`Drag release line ${release.name ?? release.tier}`}
                      >⠿</span>
                      <span
                        className={styles.releaseLabel}
                        style={{ background: releaseColor(release.tier - 1) }}
                        contentEditable="plaintext-only"
                        suppressContentEditableWarning
                        onBlur={(e) => onChange(renameRelease(model, release.tier, e.currentTarget.textContent?.trim() || null))}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        role="textbox"
                        aria-label="Release name"
                      >
                        {release.name ?? ''}
                      </span>
                      <div className={styles.releaseLine} style={{ background: releaseColor(release.tier - 1) }} />
                      <button
                        className={styles.removeReleaseBtn}
                        onClick={() => onChange(removeReleaseLine(model, release.tier))}
                        aria-label={`Remove release ${release.name ?? release.tier}`}
                      >×</button>
                    </div>
                  );
                }

                // Empty slot — only render between rows (not after the last row, that's handled below)
                if (isLast) return null;

                return (
                  <div
                    data-release-tier={tier}
                    className={`${styles.releaseSlot} ${isDragOver ? styles.releaseSlotOver : ''}`}
                    style={{ gridColumn: `1 / ${numCols + 2}` }}
                  />
                );
              })()}
            </div>
          );
        })}

        {/* + story buttons and final release drop zone after all rows */}
        {flatTasks.map(({ actIdx, taskIdx }, colIdx) => (
          <div key={`add-story-${colIdx}`} className={styles.addStoryCell} style={{ gridColumn: colIdx + 1 }}>
            <button className={styles.addStoryBtn} onClick={() => onChange(addStory(model, actIdx, taskIdx, numRows))} aria-label="Add story">+</button>
          </div>
        ))}

        {/* Final release slot — drop zone after the last row, plus the + release button */}
        <div
          data-release-tier={numRows}
          className={`${styles.releaseSlot} ${styles.releaseSlotFinal} ${relDragOver === `release-${numRows}` ? styles.releaseSlotOver : ''}`}
          style={{ gridColumn: `1 / ${numCols + 2}` }}
        >
          <button className={styles.addReleaseBtn} onClick={() => onChange(addReleaseLine(model, numRows - 1))}>+ release</button>
        </div>
      </div>
    </div>
  );
}
