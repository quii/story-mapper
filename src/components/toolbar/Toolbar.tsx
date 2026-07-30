import { useState } from 'react';
import type { StoryMap } from '../../core/types';
import type { SourceStatus } from '../../hooks/useStoryMap';
import { updateUrlHash } from '../../core/url';
import { exportSvg } from '../export/exportSvg';
import { exportHtml } from '../export/exportHtml';
import styles from './Toolbar.module.css';

interface Props {
  text: string;
  model: StoryMap;
  onLoadExample: () => void;
  onReset: () => void;
  onOpenAi: () => void;
  sourceUrl: string | null;
  sourceStatus: SourceStatus;
  sourceError: string | null;
  onSyncFromSource: () => void;
}

export function Toolbar({
  text,
  model,
  onLoadExample,
  onReset,
  onOpenAi,
  sourceUrl,
  sourceStatus,
  sourceError,
  onSyncFromSource,
}: Props) {
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const onShare = async () => {
    // In source mode the URL is just `?src=...` — never embed content in the
    // hash, or the link stops being the clean, stable pointer it's meant to be.
    if (!sourceUrl) {
      updateUrlHash(text);
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied!');
    } catch {
      showToast('Copy the URL from the address bar');
    }
  };

  const onSyncClick = () => {
    if (window.confirm('Reload from the source? This discards any local edits and cannot be undone.')) {
      onSyncFromSource();
    }
  };

  const onResetClick = () => {
    if (window.confirm('Reset the map? This clears everything you have and cannot be undone.')) {
      onReset();
    }
  };

  return (
    <header className={styles.toolbar}>
      <span className={styles.brand}>Story Map</span>
      {sourceUrl && (
        <span className={styles.sourceStatus} title={sourceUrl}>
          {sourceStatus === 'loading' && 'Loading from source…'}
          {sourceStatus === 'synced' && 'Synced from source'}
          {sourceStatus === 'error' && `Sync failed${sourceError ? `: ${sourceError}` : ''}`}
        </span>
      )}
      <div className={styles.actions}>
        <button className={styles.aiBtn} onClick={onOpenAi}>✦ Work with AI</button>
        {sourceUrl && (
          <button className={styles.btn} onClick={onSyncClick} disabled={sourceStatus === 'loading'}>
            Sync from source
          </button>
        )}
        <button className={styles.btn} onClick={onShare}>Share</button>
        <button className={styles.btn} onClick={onLoadExample}>Example</button>
        <button className={styles.btn} onClick={() => exportSvg(model)}>Export SVG</button>
        <button className={styles.btn} onClick={() => exportHtml(model)}>Export HTML</button>
        <button className={styles.btn} onClick={onResetClick}>Reset</button>
      </div>
      {toast && <div className={styles.toast}>{toast}</div>}
    </header>
  );
}
