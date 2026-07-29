import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Canvas } from '../../components/canvas/Canvas';
import { parse } from '../../core/parse';

const SIMPLE_TEXT = `activity: Discovery\n  task: Search\n    story: Find items\n`;
const EXAMPLE_MODEL = parse(SIMPLE_TEXT).model;

describe('Canvas', () => {
  it('shows empty state when no activities', () => {
    render(
      <Canvas
        model={{ title: null, releases: [], activities: [] }}
        onChange={vi.fn()}
        onLoadExample={vi.fn()}
        onStartFromScratch={vi.fn()}
      />
    );
    expect(screen.getByText(/Start your story map/i)).toBeInTheDocument();
  });

  it('calls onLoadExample when load example button clicked', () => {
    const onLoadExample = vi.fn();
    render(
      <Canvas
        model={{ title: null, releases: [], activities: [] }}
        onChange={vi.fn()}
        onLoadExample={onLoadExample}
        onStartFromScratch={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Load example/i));
    expect(onLoadExample).toHaveBeenCalled();
  });

  it('calls onStartFromScratch when start from scratch clicked', () => {
    const onStartFromScratch = vi.fn();
    render(
      <Canvas
        model={{ title: null, releases: [], activities: [] }}
        onChange={vi.fn()}
        onLoadExample={vi.fn()}
        onStartFromScratch={onStartFromScratch}
      />
    );
    fireEvent.click(screen.getByText(/Start from scratch/i));
    expect(onStartFromScratch).toHaveBeenCalled();
  });

  it('renders activity name', () => {
    render(
      <Canvas model={EXAMPLE_MODEL} onChange={vi.fn()} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
    );
    expect(screen.getByText('Discovery')).toBeInTheDocument();
  });

  it('renders task name', () => {
    render(
      <Canvas model={EXAMPLE_MODEL} onChange={vi.fn()} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
    );
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('renders story text', () => {
    render(
      <Canvas model={EXAMPLE_MODEL} onChange={vi.fn()} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
    );
    expect(screen.getByText('Find items')).toBeInTheDocument();
  });

  it('calls onChange when add activity button clicked', () => {
    const onChange = vi.fn();
    render(
      <Canvas model={EXAMPLE_MODEL} onChange={onChange} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Add activity'));
    expect(onChange).toHaveBeenCalled();
    const newModel = onChange.mock.calls[0][0];
    expect(newModel.activities).toHaveLength(2);
  });

  it('calls onChange when remove activity button clicked', () => {
    const onChange = vi.fn();
    render(
      <Canvas model={EXAMPLE_MODEL} onChange={onChange} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Remove activity Discovery'));
    expect(onChange).toHaveBeenCalled();
    const newModel = onChange.mock.calls[0][0];
    expect(newModel.activities).toHaveLength(0);
  });

  it('renders release band when release line exists', () => {
    const text = `release: MVP @ 1\nactivity: A\n  task: T\n    story: S1\n    story: S2\n`;
    const model = parse(text).model;
    render(
      <Canvas model={model} onChange={vi.fn()} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
    );
    expect(screen.getByText('MVP')).toBeInTheDocument();
  });

  it('renders title when present', () => {
    const model = parse('title: My Map\nactivity: A\ntask: T\nstory: S\n').model;
    render(
      <Canvas model={model} onChange={vi.fn()} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
    );
    expect(screen.getByText('My Map')).toBeInTheDocument();
  });

  // ── Row/release layout: these guard against the "release renders in the wrong
  // ── place" bug class, and against Canvas silently reintroducing a mismatch
  // ── between the compact (visible) row it renders and the raw items-array
  // ── index it mutates.
  describe('row and release layout', () => {
    it('places a release band between the correct stories, in DOM order', () => {
      const text = `release: MVP @ 2\nactivity: A\n  task: T\n    story: S1\n    story: S2\n    story: S3\n`;
      const model = parse(text).model;
      render(
        <Canvas model={model} onChange={vi.fn()} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
      );
      const s2 = screen.getByText('S2');
      const s3 = screen.getByText('S3');
      const mvp = screen.getByText('MVP');
      // S2 (row 2) is above the MVP line; S3 (row 3) is below it.
      expect(s2.compareDocumentPosition(mvp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(mvp.compareDocumentPosition(s3) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('collapses a tier reserved beyond current content to zero story-cell rows', () => {
      const text = `release: Beta @ 5\nactivity: A\n  task: T\n    story: S1\n    story: S2\n`;
      const model = parse(text).model;
      const { container } = render(
        <Canvas model={model} onChange={vi.fn()} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
      );
      // Only the 2 real rows get a story-cell; the 3 rows reserved to reach "@ 5" get none.
      expect(container.querySelectorAll('[class*="storyCell"]')).toHaveLength(2);
    });

    it('adds a story at the correct raw row when a prior row is a universally-empty separator', () => {
      const text = `activity: A\n  task: T\n    story: S1\n    ---\n    story: S2\n`;
      const model = parse(text).model;
      const onChange = vi.fn();
      render(
        <Canvas model={model} onChange={onChange} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
      );
      // Visible rows are [S1, S2] (the --- row is invisible with only one task).
      // Clicking "+" on the second visible row must land after the ---, not on top of it.
      const addButtons = screen.getAllByLabelText('Add story');
      fireEvent.click(addButtons[1]);
      expect(onChange).toHaveBeenCalled();
      const items = onChange.mock.calls[0][0].activities[0].tasks[0].items;
      expect(items.map((i: { type: string; text?: string }) => (i.type === 'story' ? i.text : '---')))
        .toEqual(['S1', '---', 'New story', 'S2']);
    });

    it('moves a story via drag-and-drop using the correct raw indices', () => {
      const text = `activity: A\n  task: T\n    story: S1\n    ---\n    story: S2\n`;
      const model = parse(text).model;
      const onChange = vi.fn();
      render(
        <Canvas model={model} onChange={onChange} onLoadExample={vi.fn()} onStartFromScratch={vi.fn()} />
      );
      const s1Card = screen.getByText('S1').closest('[draggable="true"]')!;
      const s2Cell = screen.getByText('S2').closest('[draggable="true"]')!.parentElement!;
      const dataTransfer = { effectAllowed: '' };
      fireEvent.dragStart(s1Card, { dataTransfer });
      fireEvent.drop(s2Cell, { dataTransfer });
      expect(onChange).toHaveBeenCalled();
      const items = onChange.mock.calls[0][0].activities[0].tasks[0].items;
      // S1 dropped onto S2's (occupied) row inserts before it, leaving the --- where it was.
      expect(items.map((i: { type: string; text?: string }) => (i.type === 'story' ? i.text : '---')))
        .toEqual(['---', 'S1', 'S2']);
    });
  });
});
