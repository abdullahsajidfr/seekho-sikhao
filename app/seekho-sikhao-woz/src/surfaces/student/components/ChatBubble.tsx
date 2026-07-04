import type { MessageRole, MessageType } from '../../../types/session';
import styles from './ChatBubble.module.css';

interface Props {
  role: MessageRole;
  text: string;
  type: MessageType;
  photoURL?: string | null;
  workbookCorrect?: boolean;
  readAloudText?: string;
  onSpeak?: () => void;
}

export default function ChatBubble({ role, text, type, photoURL, workbookCorrect, onSpeak }: Props) {
  if (type === 'workbook_answer') {
    return (
      <div className={styles.row} data-role="student">
        <div className={styles.spacer} />
        <div
          className={styles.answerBubble}
          data-correct={workbookCorrect ? 'true' : 'false'}
        >
          <img
            src="/icons/pencil.svg"
            alt=""
            className={styles.answerIcon}
            data-correct={workbookCorrect ? 'true' : 'false'}
          />
          <span className={styles.answerText}>{text}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.row} data-role={role}>
      {role === 'student' && <div className={styles.spacer} />}

      <div
        className={`${styles.bubble}${role === 'ai' && onSpeak ? ` ${styles.bubbleWithPlay}` : ''}`}
        data-role={role}
      >
        {type === 'photo' && photoURL && (
          <img className={styles.photo} src={photoURL} alt="student upload" />
        )}
        {type === 'voice' && text && (
          <div className={styles.voiceRow}>
            <img src="/icons/mic.svg" alt="voice" className={styles.voiceIcon} />
            <p className={styles.text}>{text}</p>
          </div>
        )}
        {(type === 'text' || (type === 'voice' && !text)) && text && (
          <p className={styles.text}>{text}</p>
        )}
        {role === 'ai' && onSpeak && (
          <button className={styles.speakBtn} onClick={onSpeak} aria-label="Listen again">
            <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
              <path d="M1 1L13 8L1 15V1Z" fill="currentColor" />
            </svg>
          </button>
        )}
      </div>

      {role === 'ai' && <div className={styles.spacer} />}
    </div>
  );
}
