import { useState } from 'react';
import type { StoryMap } from '../../core/types';
import { updateUrlHash } from '../../core/url';
import { exportSvg } from '../export/exportSvg';
import { exportHtml } from '../export/exportHtml';
import styles from './Toolbar.module.css';

interface Props {
  text: string;
  model: StoryMap;
  onLoadExample: () => void;
  onOpenAi: () => void;
}

export function Toolbar({ text, model, onLoadExample, onOpenAi }: Props) {
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const onShare = async () => {
    updateUrlHash(text);
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied!');
    } catch {
      showToast('Copy the URL from the address bar');
    }
  };

  return (
    <header className={styles.toolbar}>
      <span className={styles.brand}>Story Map</span>
      <div className={styles.actions}>
        <button className={styles.aiBtn} onClick={onOpenAi}>✦ Work with AI</button>
        <button className={styles.btn} onClick={onShare}>Share</button>
        <button className={styles.btn} onClick={onLoadExample}>Example</button>
        <button className={styles.btn} onClick={() => exportSvg(model)}>Export SVG</button>
        <button className={styles.btn} onClick={() => exportHtml(model)}>Export HTML</button>
      </div>
      {toast && <div className={styles.toast}>{toast}</div>}
    </header>
  );
}
