import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span>
        Story mapping invented by{' '}
        <a
          href="https://jpattonassociates.com/story-mapping/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Jeff Patton
        </a>
      </span>
      <span>
        Built by Chris James &middot;{' '}
        <a href="https://quii.dev" target="_blank" rel="noopener noreferrer">
          quii.dev
        </a>
      </span>
    </footer>
  );
}
