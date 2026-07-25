import styles from './EmptyState.module.css';

interface Props {
  onLoadExample: () => void;
  onStartFromScratch: () => void;
}

export function EmptyState({ onLoadExample, onStartFromScratch }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.heading}>Start your story map</h2>
        <p className={styles.description}>
          A story map visualises user journeys as activities, tasks, and stories.
        </p>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={onLoadExample}>
            Load example
          </button>
          <button className={styles.secondaryBtn} onClick={onStartFromScratch}>
            Start from scratch
          </button>
        </div>
      </div>
    </div>
  );
}
