import type { Session } from '../../../types/session';
import styles from './IncomingMessage.module.css';

interface Props { session: Session | null }

export default function IncomingMessage({ session }: Props) {
  const msg = session?.studentMessage;
  const isNew = session?.status === 'student_sent';

  return (
    <div className={`${styles.panel} ${isNew ? styles.flash : ''}`}>
      <h2 className={styles.heading}>Student Message</h2>
      {!msg?.text && !msg?.photoURL ? (
        <p className={styles.empty}>Waiting for student…</p>
      ) : (
        <>
          <span className={styles.typeBadge}>{msg.type}</span>
          {msg.photoURL && (
            <img className={styles.photo} src={msg.photoURL} alt="student upload" />
          )}
          {msg.type === 'voice' && <span>🎤</span>}
          <p className={styles.text}>{msg.text}</p>
          {msg.timestamp > 0 && (
            <p className={styles.time}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
          )}
        </>
      )}
    </div>
  );
}
