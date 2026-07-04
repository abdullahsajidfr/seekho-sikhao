import styles from './TopBar.module.css';

interface Props {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export default function TopBar({ title, showBack, onBack, rightSlot }: Props) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        {showBack && (
          <button className={styles.backBtn} onClick={onBack} aria-label="Go back">
            <svg className={styles.backIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3.825 9L9.425 14.6L8 16L0 8L8 0L9.425 1.4L3.825 7H16V9H3.825Z"
                fill="currentColor"
              />
            </svg>
            {title && <span className={styles.backLabel}>{title}</span>}
          </button>
        )}
        {!showBack && title && <span className={styles.title}>{title}</span>}
      </div>
      {rightSlot && <div className={styles.right}>{rightSlot}</div>}
    </div>
  );
}
