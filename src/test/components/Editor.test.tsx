import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '../../components/editor/Editor';

describe('Editor', () => {
  const setup = (text = '', onChange = vi.fn()) => {
    render(<Editor text={text} diagnostics={[]} onChange={onChange} />);
    const textarea = screen.getByRole('textbox', { name: /story map text editor/i }) as HTMLTextAreaElement;
    return { textarea, onChange };
  };

  it('renders textarea with correct value', () => {
    const { textarea } = setup('activity: A\n');
    expect(textarea.value).toBe('activity: A\n');
  });

  it('calls onChange when user types', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Editor text="" diagnostics={[]} onChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('does not throw when typing a long line (wraps instead of scrolling horizontally)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Editor text="" diagnostics={[]} onChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'x'.repeat(200));
    expect(onChange).toHaveBeenCalledTimes(200);
  });

  it('sizes a gutter line number to match that line\'s real rendered height', () => {
    // jsdom has no real layout engine, so mock offsetHeight to simulate a wrapped line
    // (as if it rendered three rows tall) and confirm the gutter picks that up.
    const spy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.textContent === 'a very long wrapped line' ? 62.4 : 20.8;
    });
    const { container } = render(
      <Editor text={'short\na very long wrapped line\nshort2'} diagnostics={[]} onChange={vi.fn()} />
    );
    spy.mockRestore();

    const gutterLines = container.querySelectorAll('[class*="gutterLine"]');
    expect(gutterLines[1]).toHaveStyle({ height: '62.4px' });
  });

  it('syncs vertical scroll onto the highlight layer natively, not via transform', () => {
    // A large `translateY` on a very tall absolutely-positioned element can fail to
    // rasterize in some browsers (verified manually: content moved into view via
    // transform wasn't painted, while the same content scrolled into view natively
    // was). The highlight layer must be scrolled directly, not transformed.
    const { container } = render(<Editor text={'line1\nline2\nline3'} diagnostics={[]} onChange={vi.fn()} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const layer = container.querySelector('[class*="_layer_"]') as HTMLElement;

    Object.defineProperty(textarea, 'scrollTop', { value: 123, configurable: true });
    textarea.dispatchEvent(new Event('scroll', { bubbles: true }));

    expect(layer.scrollTop).toBe(123);
    expect(layer.style.transform).toBe('');
  });

  it('shows diagnostics panel when diagnostics exist', () => {
    render(
      <Editor
        text=""
        diagnostics={[{ severity: 'error', line: 1, message: 'Test error' }]}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('hides diagnostics panel when no diagnostics', () => {
    render(<Editor text="" diagnostics={[]} onChange={vi.fn()} />);
    expect(screen.queryByText(/error|warning/)).not.toBeInTheDocument();
  });

  it('shows suggestion in diagnostics', () => {
    render(
      <Editor
        text=""
        diagnostics={[{ severity: 'warning', line: 1, message: 'Bad keyword', suggestion: 'Did you mean activity?' }]}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Did you mean activity?')).toBeInTheDocument();
  });

  it('renders line numbers', () => {
    render(<Editor text={'line1\nline2\nline3'} diagnostics={[]} onChange={vi.fn()} />);
    // Gutter should have numbers 1, 2, 3
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
