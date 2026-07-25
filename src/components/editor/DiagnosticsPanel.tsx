import type { Diagnostic } from '../../core/types';
import styles from './DiagnosticsPanel.module.css';

interface Props {
  diagnostics: Diagnostic[];
  onJumpToLine: (line: number) => void;
}

export function DiagnosticsPanel({ diagnostics, onJumpToLine }: Props) {
  if (diagnostics.length === 0) return null;

  return (
    <div className={styles.panel} role="log" aria-live="polite" aria-label="Diagnostics">
      {diagnostics.map((d, i) => (
        <button
          key={i}
          className={`${styles.row} ${styles[d.severity]}`}
          onClick={() => d.line > 0 && onJumpToLine(d.line)}
          disabled={d.line === 0}
        >
          <span className={styles.badge}>{d.severity}</span>
          {d.line > 0 && <span className={styles.lineNo}>L{d.line}</span>}
          <span className={styles.message}>{d.message}</span>
          {d.suggestion && <span className={styles.suggestion}>{d.suggestion}</span>}
        </button>
      ))}
    </div>
  );
}
