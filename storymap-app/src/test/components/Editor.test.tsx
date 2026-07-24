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
