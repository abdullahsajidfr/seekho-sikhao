import type { Session } from '../../../types/session';
import styles from './SessionInfo.module.css';

interface Props {
  roomCode: string | null;
  session: Session | null;
  onGenerate: () => void;
}

export default function SessionInfo({ roomCode, session, onGenerate }: Props) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Room</h2>
      {!roomCode ? (
        <button className={styles.generateBtn} data-log="wizard:generate-room" onClick={onGenerate}>
          Generate Room
        </button>
      ) : (
        <>
          <div className={styles.code}>{roomCode}</div>
          <div className={styles.row}>
            <span className={styles.label}>Subject:</span>
            <span>{session?.subject ?? '—'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Status:</span>
            <span className={`${styles.badge} ${styles[session?.status ?? 'idle']}`}>
              {session?.status ?? 'idle'}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Language:</span>
            <span>{session?.language ?? '—'}</span>
          </div>
        </>
      )}
    </div>
  );
}
