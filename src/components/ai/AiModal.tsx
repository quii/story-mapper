import { useState, useEffect, useRef } from 'react';
import { buildPrompt } from './prompt';
import styles from './AiModal.module.css';

interface Props {
  onClose: () => void;
}

export function AiModal({ onClose }: Props) {
  const [description, setDescription] = useState('');
  const [releaseCount, setReleaseCount] = useState(2);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const prompt = description.trim() ? buildPrompt(description, releaseCount) : '';

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Work with AI">
        <div className={styles.header}>
          <h2 className={styles.title}>✦ Work with AI</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className={styles.body}>
          <p className={styles.intro}>
            Describe your product below. We'll generate a prompt you can paste into any AI assistant — ChatGPT, Claude, Gemini, or similar. Paste the result straight back into the editor.
          </p>

          <label className={styles.label} htmlFor="ai-description">
            What are you building?
          </label>
          <textarea
            ref={textareaRef}
            id="ai-description"
            className={styles.descriptionInput}
            placeholder="e.g. A mobile app for tracking personal fitness goals and workouts"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <div className={styles.releaseRow}>
            <label className={styles.label} htmlFor="release-count">
              How many release phases?
            </label>
            <div className={styles.releasePicker}>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  className={`${styles.releaseOption} ${releaseCount === n ? styles.releaseOptionActive : ''}`}
                  onClick={() => setReleaseCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className={styles.releaseHint}>
              e.g. {releaseCount === 1 ? 'MVP' : releaseCount === 2 ? 'MVP, v2' : releaseCount === 3 ? 'MVP, Beta, v2' : 'MVP, Beta, v2, v3'}
            </span>
          </div>

          {prompt && (
            <>
              <div className={styles.promptHeader}>
                <span className={styles.promptLabel}>Your prompt — paste into an AI chat</span>
                <button
                  className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copied!' : 'Copy prompt'}
                </button>
              </div>
              <div className={styles.promptBox}>
                <pre className={styles.promptText}>{prompt}</pre>
              </div>
              <p className={styles.hint}>
                Paste the AI's response into the editor. Release lines will appear at placeholder positions — drag them to the right rows on the canvas.
              </p>
            </>
          )}

          {!prompt && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>✦</span>
              <p>Enter a description above to generate your prompt.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
