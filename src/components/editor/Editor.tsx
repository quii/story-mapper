import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type UIEvent } from 'react';
import type { Diagnostic } from '../../core/types';
import { SyntaxHighlight } from './SyntaxHighlight';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import styles from './Editor.module.css';

interface Props {
  text: string;
  diagnostics: Diagnostic[];
  onChange: (text: string) => void;
}

// Fallback row height (matches .gutterLine's CSS) used before a line's real,
// possibly-wrapped height has been measured.
const DEFAULT_LINE_HEIGHT = 13 * 1.6;

export function Editor({ text, diagnostics, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  const lines = text.split('\n');
  const lineCount = lines.length;

  // Long lines wrap instead of scrolling horizontally, so a source line can span
  // multiple visual rows. The gutter's line numbers need each row's real rendered
  // height (read off the highlight layer, which wraps identically to the textarea)
  // rather than assuming one fixed height per line.
  const [lineHeights, setLineHeights] = useState<number[]>([]);

  const measureLineHeights = useCallback(() => {
    const layer = highlightRef.current;
    if (!layer) return;
    setLineHeights(Array.from(layer.children, child => (child as HTMLElement).offsetHeight));
  }, []);

  useLayoutEffect(() => {
    measureLineHeights();
  }, [text, measureLineHeights]);

  useLayoutEffect(() => {
    const wrapper = editorScrollRef.current;
    if (!wrapper || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measureLineHeights);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [measureLineHeights]);

  const syncScroll = useCallback((e: UIEvent<HTMLTextAreaElement>) => {
    const top = (e.target as HTMLTextAreaElement).scrollTop;
    // Scroll the layer natively (it already has its own overflow:hidden, so it's
    // a valid scroll container) rather than transforming it — a large
    // `translateY` on a very tall absolutely-positioned element can fail to
    // rasterize in some browsers (content moved into view via transform isn't
    // always painted the way actually-scrolled content is).
    if (highlightRef.current) highlightRef.current.scrollTop = top;
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

  const jumpToLine = useCallback(
    (lineNo: number) => {
      const el = textareaRef.current;
      if (!el) return;
      const lines = el.value.split('\n');
      let offset = 0;
      for (let i = 0; i < lineNo - 1 && i < lines.length; i++) offset += lines[i].length + 1;
      const end = offset + (lines[lineNo - 1]?.length ?? 0);
      el.focus();
      el.setSelectionRange(offset, end);
      // Land the target line a couple of rows down from the top, using each
      // line's real (possibly wrapped) height rather than a fixed row height.
      let top = 0;
      for (let i = 0; i < lineNo - 3; i++) top += lineHeights[i] ?? DEFAULT_LINE_HEIGHT;
      el.scrollTop = Math.max(0, top);
    },
    [lineHeights]
  );

  return (
    <div className={styles.editorPane}>
      <div className={styles.editorArea}>
        <div ref={gutterRef} className={styles.gutter} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={styles.gutterLine} style={lineHeights[i] ? { height: `${lineHeights[i]}px` } : undefined}>
              {i + 1}
            </div>
          ))}
        </div>
        <div ref={editorScrollRef} className={styles.editorScroll}>
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
