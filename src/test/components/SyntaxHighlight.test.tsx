import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SyntaxHighlight } from '../../components/editor/SyntaxHighlight';

describe('SyntaxHighlight', () => {
  it('renders each line with exactly the same text as the input, no stray characters', () => {
    // Lines with zero leading indentation (title/activity/release/blank) previously got a
    // zero-width space injected before them that doesn't exist in the real textarea value —
    // harmless-width in some fonts, but a real character mismatch that misaligns the caret
    // in others. Every rendered line must match its source line exactly.
    const text = 'title: My Map\n\nactivity: A\n  task: T\n    story: S\nrelease: MVP @ 1\n';
    const lines = text.split('\n');
    const { container } = render(<SyntaxHighlight text={text} />);
    const rendered = Array.from(container.querySelectorAll('[class*="line"]')).map(el => el.textContent);
    expect(rendered).toEqual(lines);
  });

  it('renders a blank line with no visible or invisible characters', () => {
    const { container } = render(<SyntaxHighlight text={'activity: A\n\nactivity: B'} />);
    const lineDivs = container.querySelectorAll('[class*="line"]');
    expect(lineDivs[1].textContent).toBe('');
  });
});
