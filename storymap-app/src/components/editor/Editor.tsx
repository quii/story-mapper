import { useCallback, useRef, type KeyboardEvent, type UIEvent } from 'react';
import type { Diagnostic } from '../../core/types';
import { SyntaxHighlight } from './SyntaxHighlight';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import styles from './Editor.module.css';

interface Props {
  text: string;
  diagnostics: Diagnostic[];
  onChange: (text: string) => void;
}

export function Editor({ text, diagnostics, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = text.split('\n');
  const lineCount = lines.length;

  const syncScroll = useCallback((e: UIEvent<HTMLTextAreaElement>) => {
    const top = (e.target as HTMLTextAreaElement).scrollTop;
    const left = (e.target as HTMLTextAreaElement).scrollLeft;
    // Move the highlight layer by translate rather than scrolling — the wrapper
    // has overflow:hidden so scrollTop/scrollLeft have no effect on it.
    if (highlightRef.current) {
      highlightRef.current.style.transform = `translate(${-left}px, ${-top}px)`;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = top;
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      const { selectionStart, selectionEnd, value } = el;

      if (e.key === 'Tab') {
        e.preventDefault();
        if (selectionStart === selectionEnd) {
          const newVal = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd);
          onChange(newVal);
          requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = selectionStart + 2;
          });
        } else {
          const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
          const lineEnd = value.indexOf('\n', selectionEnd);
          const block = value.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
          const indented = e.shiftKey
            ? block.replace(/^  /gm, '')
            : block.replace(/^/gm, '  ');
          const newVal = value.slice(0, lineStart) + indented + (lineEnd < 0 ? '' : value.slice(lineEnd));
          onChange(newVal);
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const currentLine = value.slice(lineStart, selectionStart);
        const indent = currentLine.match(/^(\s*)/)?.[1] ?? '';
        const newVal = value.slice(0, selectionStart) + '\n' + indent + value.slice(selectionEnd);
        onChange(newVal);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = selectionStart + 1 + indent.length;
        });
      }
    },
    [onChange]
  );

  const jumpToLine = useCallback((lineNo: number) => {
    const el = textareaRef.current;
    if (!el) return;
    const lines = el.value.split('\n');
    let offset = 0;
    for (let i = 0; i < lineNo - 1 && i < lines.length; i++) offset += lines[i].length + 1;
    const end = offset + (lines[lineNo - 1]?.length ?? 0);
    el.focus();
    el.setSelectionRange(offset, end);
    el.scrollTop = Math.max(0, (lineNo - 3) * 20.8);
  }, []);

  return (
    <div className={styles.editorPane}>
      <div className={styles.editorArea}>
        <div ref={gutterRef} className={styles.gutter} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={styles.gutterLine}>{i + 1}</div>
          ))}
        </div>
        <div className={styles.editorScroll}>
          <div className={styles.highlightWrapper}>
            <SyntaxHighlight text={text} layerRef={highlightRef} />
          </div>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            aria-label="Story map text editor"
            aria-describedby="diagnostics-panel"
          />
        </div>
      </div>
      <div id="diagnostics-panel">
        <DiagnosticsPanel diagnostics={diagnostics} onJumpToLine={jumpToLine} />
      </div>
    </div>
  );
}
