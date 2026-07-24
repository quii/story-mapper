import type { Ref } from 'react';
import { tokenizeLine } from './tokenize';
import styles from './SyntaxHighlight.module.css';

interface Props {
  text: string;
  layerRef?: Ref<HTMLDivElement>;
}

export function SyntaxHighlight({ text, layerRef }: Props) {
  const lines = text.split('\n');
  return (
    <div ref={layerRef} className={styles.layer} aria-hidden="true">
      {lines.map((line, i) => {
        const tokens = tokenizeLine(line);
        return (
          <div key={i} className={styles.line}>
            {tokens.map((tok, j) => (
              <span key={j} className={tok.type !== 'plain' ? styles[tok.type] : undefined}>
                {tok.text || '\u200b'}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
