# Story Map Editor — Requirements Document

## Overview

A web-based interactive story map editor. Users write a simple plain-text description of a story map and see a live visual representation. The visual map is fully interactive: cards can be renamed inline, reordered by drag-and-drop, and cards/release lines can be added or removed. The current state is encoded in the URL so maps can be shared without a backend.

This document describes the full feature set of the existing single-file prototype (`storymap.html`) in enough detail for a coding agent to re-implement it as a modern, tested React application.

---

## 1. Concepts & Terminology

A **story map** is a two-dimensional agile planning tool:

- **Activity** — a top-level user goal (e.g. "Browse catalogue"). Groups one or more tasks.
- **Task** — a step a user takes to accomplish an activity (e.g. "Search by keyword"). Contains stories.
- **Story** — a concrete behaviour or requirement (e.g. "Filter by category"). Belongs to exactly one task.
- **Release** — a horizontal separator that slices stories into delivery tiers (e.g. "MVP", "v2"). A release line spans all task columns at the same vertical position.

Visual layout:

```
┌──────────────────────┐  ┌──────────────┐
│      Activity A      │  │  Activity B  │  ← activity row (backbone)
├────────┬─────────────┤  ├──────────────┤
│ Task 1 │   Task 2   │  │    Task 3    │  ← task row (backbone)
├────────┼─────────────┼──┼──────────────┤
│ Story  │ Story      │  │ Story        │  ← tier 0 (rows of story cards)
│ Story  │            │  │              │
├────────┴─────────────┴──┴──────────────┤  ← release line ("MVP")
│ Story  │ Story      │  │              │  ← tier 1
└────────┴────────────┴──┴──────────────┘
```

---

## 2. Text Format

The canonical representation is a plain-text format parsed line-by-line. Indentation is cosmetic only — structure is inferred from keyword prefixes.

### 2.1 Grammar

```
document  ::= line*
line      ::= comment | blank | title | activity | task | story | release
comment   ::= /^\s*#/ <anything>
blank     ::= /^\s*$/
title     ::= /^title\s*:/i <text>
activity  ::= /^activity\s*:/i <text>
task      ::= /^task\s*:/i <text>
story     ::= /^story\s*:/i <text>
release   ::= /^---/ [ <text> ]
```

- All lines are trimmed before matching.
- Keywords are case-insensitive.
- `title` is optional and global; last occurrence wins.
- `activity` starts a new activity group; resets the current task.
- `task` belongs to the most recently opened activity.
- `story` belongs to the most recently opened task.
- `release` (`---`) starts a new tier within the most recently opened task; optional text after the dashes is the release name.

### 2.2 Example

```
title: E-Commerce Platform

activity: Discovery
  task: Search
    story: Search by keyword
    story: Filter by category
    --- MVP
    story: Save search
  task: Browse
    story: View product list
    story: Sort results
    --- MVP
    story: Infinite scroll

activity: Purchase
  task: Cart
    story: Add to cart
    story: View cart
    --- MVP
    story: Save cart
```

### 2.3 Serialization

When the visual canvas is edited, the model is serialized back to text using this format:
- One activity per group, followed by a blank line.
- Each task directly under its activity.
- Stories and release separators in flat order within each task.
- Release items serialize as `--- <name>` (or just `---` if the release has no name).

### 2.4 Validation & Diagnostics

The parser must produce structured diagnostics with severity (`error` | `warning`) and a line number:

| Condition | Severity |
|---|---|
| `task:` with no preceding `activity:` | error |
| `story:` or `---` with no preceding `task:` | error |
| Unknown keyword that looks like a typo (Levenshtein distance ≤ 2 from a known keyword) | warning + suggestion |
| Plural keyword used (`activities`, `tasks`, `stories`) | warning + correction |
| No activities defined | warning |
| Activity with no tasks | warning |
| Task with no stories | warning |
| Story text longer than 120 characters | warning |
| Inconsistent release separator counts across tasks in the same activity | warning |

---

## 3. Data Model

```ts
interface StoryMap {
  title: string | null;
  activities: Activity[];
}

interface Activity {
  id: string;          // stable UUID, generated on parse/create
  name: string;
  tasks: Task[];
}

interface Task {
  id: string;
  name: string;
  items: Item[];       // flat ordered array of stories and release separators
}

type Item = StoryItem | ReleaseItem;

interface StoryItem {
  id: string;
  type: 'story';
  text: string;
}

interface ReleaseItem {
  id: string;
  type: 'release';
  name: string | null;
}
```

**Key rule**: the tier structure is computed on demand by splitting each task's `items` array at `ReleaseItem` boundaries. It is not stored explicitly.

Derived computations needed by the renderer:

- `allTasks(activities)` — flattened list of all tasks across all activities, injecting a phantom empty task for any activity that has zero tasks (to ensure the grid always has a column for every activity).
- `splitTiers(task)` — splits `task.items` into `tiers: StoryItem[][]`, one bucket per tier.
- `tierMaxRows(activities)` — for each tier index, the maximum number of stories across all task columns.
- `releaseNames(activities)` — ordered list of unique release names derived from separator positions.

---

## 4. Application Layout

The app is a split-pane layout:

```
┌──────────────────────────────────────────────────────────┐
│ [Title]              [Share] [Example] [SVG] [HTML]      │  ← toolbar
├──────────────────┬───┬───────────────────────────────────┤
│                  │   │                                   │
│   Text Editor    │ ↔ │       Visual Canvas               │
│   (textarea)     │   │       (interactive map)           │
│                  │   │                                   │
└──────────────────┴───┴───────────────────────────────────┘
│ Error panel (shown when diagnostics exist)               │
└──────────────────────────────────────────────────────────┘
```

- The split is horizontally resizable by dragging a handle between the panes.
- Editor pane minimum width: 160px; maximum: 700px.
- The visual canvas is horizontally scrollable when the map is wide.

---

## 5. Text Editor Pane

### 5.1 Editor Features

- Plain `<textarea>` for input.
- **Syntax highlighting**: a read-only overlay layer rendered behind the textarea that highlights keywords (`title`, `activity`, `task`, `story`, `---`) in distinct colours. The overlay must scroll in sync with the textarea.
- **Line gutter**: line numbers displayed to the left, also scroll-synced.
- **Diagnostics panel**: displayed below the editor. Each row shows severity badge, line number, message, and optional suggestion. Clicking a row selects and scrolls to that line in the editor.

### 5.2 Keyboard Behaviour

| Key | Action |
|---|---|
| `Tab` | Insert 2 spaces (no selection) or indent all selected lines by 2 spaces |
| `Shift+Tab` | Remove up to 2 leading spaces from current or all selected lines |
| `Enter` | Insert newline matching current line's leading whitespace |

---

## 6. Visual Canvas

### 6.1 Structure

The canvas is rendered in three horizontal bands:

1. **Title row** (optional): displayed above the backbone if `title` is set.
2. **Backbone**: activity cards followed immediately below by task cards, laid out in a continuous horizontal flex/grid.
3. **Story grid**: a CSS grid with `N` columns (one per task, including phantom columns for empty activities), 160px per column, 4px gap. Contains story cells, release bands, and drop zones.

### 6.2 Activity Cards

- Dark background (e.g. `#1a1a18`), white text.
- Width = `(taskCount × 160) + ((taskCount - 1) × 4)` pixels, matching the combined width of the task columns beneath.
- If an activity has zero tasks, it still occupies a 160px phantom column.
- Contains:
  - Editable activity name (inline `contenteditable`).
  - Remove button (visible on hover).

### 6.3 Task Cards

- Light grey background.
- Exactly 160px wide.
- Contains:
  - Editable task name (inline `contenteditable`).
  - Remove button (visible on hover).
  - `+ task` button to the right of the last task in its activity (visible on hover of the activity).
- Draggable to reorder tasks (including across activity boundaries).

### 6.4 Story Cells and Cards

- Each cell is exactly 160px × 48px.
- Every task column renders exactly `tierMaxRows[tier]` cells per tier, leaving empty cells where a column has fewer stories.
- A filled cell contains a story card:
  - White background, rounded corners, subtle border.
  - Editable story text (inline `contenteditable`).
  - Remove button (visible on cell hover).
  - Draggable to other cells (filled or empty, within or across columns and tiers).
- An empty cell is a valid drop target for story cards.

### 6.5 Release Bands

- Full-width (`grid-column: 1 / -1`) horizontal dividers between tiers.
- Contain:
  - Drag grip handle.
  - Colour-coded label badge showing release name.
  - Editable release name (inline `contenteditable`).
  - Horizontal line filling the remaining width.
  - `+ release` button (inserts a new release line above this one).
  - Remove button.
- Release bands are draggable to reorder them (swap positions with another release band, or drop into a fine-grained drop zone slot).
- Release colours cycle through a fixed palette of 10 colours.

### 6.6 Drop Zones for Release Lines

- Thin invisible horizontal strips (`rel-drop-zone`) are inserted before every story slot row and after the last slot of each tier, spanning the full grid width.
- During a release drag, all drop zones expand (e.g. from 6px to 20px) with a visual dashed border to indicate valid drop targets.
- Dropping a release band onto a drop zone moves it to that precise slot position.

### 6.7 Adding Cards

| Action | Result |
|---|---|
| `+ activity` button (after last activity) | Appends `{ name: 'New activity', tasks: [] }` |
| `+ task` button (after last task in activity) | Appends `{ name: 'New task', items: [] }` |
| `+ story` button (per tier per task column) | Appends `{ type: 'story', text: 'New story' }` at end of that tier in that task |
| `+ release` button on a release band | Inserts a new release line above the clicked one |
| `+ release` button (at end of grid) | Appends a new release line after the last tier |

### 6.8 Empty State

When the model has no activities:
- Show two buttons: **Load Example** and **Start from Scratch**.
- **Load Example** loads a predefined multi-activity example map.
- **Start from Scratch** loads a minimal one-activity, one-task, one-story starter.

---

## 7. Bidirectional Sync

### 7.1 Text → Canvas

1. On every `input` event in the editor (debounced for URL sync, not for rendering):
2. Parse the text → produce `{ title, activities, diagnostics }`.
3. Update diagnostics panel.
4. Update `model`.
5. Re-render the canvas.

A boolean flag `suppressTextSync` prevents echo loops: when the canvas writes to the editor, the resulting `input` event is ignored.

### 7.2 Canvas → Text

After any canvas mutation (inline edit blur, drag-drop reorder, add/remove):
1. Serialize `model` to text.
2. Write to editor textarea (with `suppressTextSync = true`).
3. Re-render canvas if structure changed.

### 7.3 URL Sync

- The URL hash contains a base64url-encoded UTF-8 representation of the current text.
- Encoding: `TextEncoder → Uint8Array → binary string → btoa → base64url`.
- Decoding: reverse of above, wrapped in try/catch.
- The hash is updated (via `history.replaceState`) on every editor input, debounced by 800ms.
- On page load, if a hash is present, decode it and load it into the editor.
- The **Share** button encodes the current text, updates the hash immediately, and copies the full URL to the clipboard.

---

## 8. Drag and Drop

### 8.1 Task Column Reorder

- **Mechanism**: HTML5 Drag and Drop API.
- **Draggable**: the entire task column container.
- **Target**: any other task column.
- **Result**: the dragged task is removed from its original position and inserted at the drop position, potentially moving it to a different activity.
- **Visual feedback**: dragged column gets reduced opacity; target column gets a highlight border.

### 8.2 Story Card Reorder

- **Mechanism**: HTML5 Drag and Drop API.
- **Draggable**: story cards.
- `stopPropagation` on drag start prevents task drag from also firing.
- **Target**: any story cell (filled or empty), in any column and tier.
- **Result**:
  - If dropped on a filled cell: the dragged story is inserted before the target story.
  - If dropped on an empty cell: the dragged story is appended at the end of the target tier in that column.
- **Visual feedback**: dragged card gets reduced opacity; target cell gets a dashed outline.

### 8.3 Release Line Reorder

- **Mechanism**: Pointer Events (not HTML5 D&D, to avoid re-render timing bugs).
- **Draggable**: release grip handle.
- A ghost label follows the cursor during drag.
- **Targets**:
  - Another release band: swaps the two release lines (and their associated story tiers).
  - A drop zone: moves the release line to that precise vertical slot.
- **Visual feedback**: source band dimmed; drop zones expand and highlight on hover.

---

## 9. Export

### 9.1 SVG Export

Produces a static SVG representation of the current map. No external library.

Layout constants:
- Card width: 160px; gap: 4px; padding: 24px.
- Activity row height: 40px; task row: 36px; story card: 48px; release band: 28px; title: 44px.

Rendering:
- Background rectangle.
- Title text (if set).
- Activity cards: dark fill, white centred text, width proportional to task count.
- Task cards: light grey fill.
- Story cards: white fill, rounded corners, light border, word-wrapped text.
- Release bands: coloured fill, label text, a 2px horizontal line across remaining width.
- Text word-wrapping: greedy word-wrap at 22 characters per line.

Download as `<title>.svg` (or `storymap.svg` if no title).

### 9.2 HTML Export

Produces a fully self-contained static HTML file of the rendered map.

- Embeds the full stylesheet.
- Renders the same DOM structure as the live canvas but removes all interactive attributes (`contenteditable`, drag handles, add/remove buttons).
- No JavaScript included.

Download as `<title>.html`.

---

## 10. Technical Requirements

### 10.1 Stack

- **Framework**: React 18+ with TypeScript.
- **Build tool**: Vite.
- **Styling**: CSS Modules or Tailwind CSS (no CSS-in-JS required, but keep styles co-located with components).
- **No backend**: purely client-side. No database, no authentication, no API calls.
- **No external state management library required** — React state and context are sufficient given the model's simplicity.

### 10.2 Project Structure

```
src/
  core/
    types.ts          # StoryMap, Activity, Task, Item type definitions
    parse.ts          # Text → StoryMap + diagnostics
    serialize.ts      # StoryMap → text
    url.ts            # URL hash encode/decode
    layout.ts         # allTasks, splitTiers, tierMaxRows, releaseNames
    model.ts          # Pure model-mutation helpers (add, remove, move, rename)
  components/
    App.tsx
    toolbar/
    editor/
      Editor.tsx
      SyntaxHighlight.tsx
      Gutter.tsx
      DiagnosticsPanel.tsx
    canvas/
      Canvas.tsx
      ActivityCard.tsx
      TaskCard.tsx
      StoryCell.tsx
      StoryCard.tsx
      ReleaseBand.tsx
      DropZone.tsx
      EmptyState.tsx
    export/
      exportSvg.ts
      exportHtml.ts
  hooks/
    useStoryMap.ts    # Core state: model, text, sync, URL
    useDragDrop.ts    # Drag and drop state machine
    useResize.ts      # Pane resize handle
  test/
    core/             # Unit tests for parse, serialize, layout, model helpers
    components/       # Component tests (React Testing Library)
    e2e/              # End-to-end tests (Playwright)
```

### 10.3 Testing

**Unit tests** (Vitest):

- `parse.ts`:
  - All keyword variants (case insensitivity, with/without indentation).
  - All diagnostic conditions (each error and warning case).
  - Typo detection and plural detection.
  - Correct handling of comments and blank lines.
  - Edge cases: empty input, only comments, title-only.

- `serialize.ts`:
  - Round-trip property: `serialize(parse(text).model) → parse → same model`.
  - Correct blank-line grouping.
  - Release lines with and without names.

- `layout.ts`:
  - `allTasks` injects phantom tasks correctly.
  - `splitTiers` produces correct tier buckets.
  - `tierMaxRows` returns correct max per tier.
  - `releaseNames` returns ordered unique names.

- `model.ts`:
  - Each mutation helper (add activity, add task, add story, add release, remove each, move task, move story, move release, rename release).

- `url.ts`:
  - Encode → decode round-trip.
  - Handles Unicode correctly.
  - Graceful failure on malformed hashes.

**Component tests** (React Testing Library):

- Editor keyboard shortcuts (Tab, Shift+Tab, Enter auto-indent).
- Clicking a diagnostic row selects the correct line.
- Inline editing: blur saves the new value and syncs text.
- Add/remove buttons mutate state and re-render correctly.
- Empty state buttons load the correct initial text.
- Share button copies URL to clipboard (mock `navigator.clipboard`).

**End-to-end tests** (Playwright):

- Type into the editor; canvas updates.
- Edit a card name in the canvas; editor updates.
- Drag a story card to a different cell.
- Drag a task column to a different position.
- Drag a release line to a different tier.
- Add and remove activities, tasks, stories, and release lines.
- Load from URL hash: navigate to a URL with a valid hash; correct map loads.
- Export SVG: clicking the button triggers a file download.
- Resize the split pane.

### 10.4 State Management

A single custom hook `useStoryMap` manages all shared state:

```ts
interface StoryMapState {
  text: string;           // current editor text (canonical source)
  model: StoryMap;        // parsed model
  diagnostics: Diagnostic[];
}

interface StoryMapActions {
  setText(text: string): void;   // text → parse → update model + diagnostics
  updateModel(model: StoryMap): void;  // model → serialize → update text
}
```

The hook also handles:
- Debounced URL hash updates on text change (800ms).
- Reading initial state from URL hash on mount.

### 10.5 IDs

All model entities (`Activity`, `Task`, `StoryItem`, `ReleaseItem`) must carry a stable `id` (UUID). IDs are generated on create and preserved through serialize/parse round-trips by embedding them as hidden comments or by managing them purely in memory (regenerating them on parse is acceptable, as the prototype does not require history or undo).

### 10.6 Accessibility

- All interactive controls (buttons, editable cards) must be keyboard accessible.
- Use semantic HTML where possible.
- Drag-and-drop operations should have keyboard alternatives (e.g. move up/down buttons visible on focus).
- Error messages in the diagnostics panel should be announced by screen readers (`role="alert"` or `aria-live`).

### 10.7 Constraints

- No backend, no build-time data fetching.
- The URL hash must remain the only persistence mechanism.
- The app must work in all modern browsers (Chrome, Firefox, Safari, Edge).
- No external UI component libraries (implement components from scratch to avoid bundle bloat and maintain full control).
- External utility libraries are acceptable (e.g. `uuid` for ID generation).

---

## 11. Visual Design Reference

### Colour Palette

| Element | Colour |
|---|---|
| Page background | `#f7f7f5` |
| Activity card | `#1a1a18` (text: `#ffffff`) |
| Task card | `#e8e4de` |
| Story card | `#ffffff` (border: `#d0ccc6`) |
| Accent (drag highlight, links) | `#2563eb` |
| Error badge | `#dc2626` |
| Warning badge | `#d97706` |

### Release Palette (10 colours, cycled)

```
#6366f1, #0ea5e9, #10b981, #f59e0b,
#ef4444, #8b5cf6, #ec4899, #14b8a6,
#f97316, #84cc16
```

### Dimensions

| Element | Width | Height |
|---|---|---|
| Task / story column | 160px | — |
| Column gap | 4px | — |
| Story card | 160px | 48px |
| Task card | 160px | 36px |
| Activity card | computed | 40px |
| Release band | full width | 28px |
| Drop zone (inactive) | full width | 6px |
| Drop zone (active drag) | full width | 20px |

---

## 12. Out of Scope

The following features are explicitly not required:

- User accounts or cloud storage.
- Undo/redo history.
- Collaborative real-time editing.
- Comments or annotations on cards.
- Image attachments.
- Print layout.
- Mobile touch support (pointer events for release drag is acceptable as-is; full mobile optimisation is not required).
- Theming or dark mode.
