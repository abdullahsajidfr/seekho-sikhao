import styles from './WorkbookQuestionCard.module.css';

interface Props {
  question: string;
  onTry: () => void;
}

export default function WorkbookQuestionCard({ question, onTry }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.prompt}>Try this question!</p>
      <div className={styles.row}>
        <p className={styles.question}>{question}</p>
        <button className={styles.tryBtn} onClick={onTry} aria-label="Open workbook">
          <img src="/icons/pencil.svg" alt="" className={styles.pencilIcon} />
        </button>
      </div>
    </div>
  );
}
