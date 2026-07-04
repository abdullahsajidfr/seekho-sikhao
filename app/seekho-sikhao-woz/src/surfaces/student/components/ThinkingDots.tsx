import styles from './ThinkingDots.module.css';

export default function ThinkingDots() {
  return (
    <div className={styles.row}>
      <div className={styles.bubble}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
