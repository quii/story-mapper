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
});
