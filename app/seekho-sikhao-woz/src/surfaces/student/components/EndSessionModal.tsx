import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { endSession, setShowEndModal } from '../../../firebase/session';
import { useLanguage } from '../../../context/LanguageContext';
import styles from './EndSessionModal.module.css';

interface Props {
  roomCode: string;
}

export default function EndSessionModal({ roomCode }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  async function handleLogOut() {
    await endSession(roomCode);
    navigate('/');
  }

  async function handleCancel() {
    await setShowEndModal(roomCode, false);
  }

  return createPortal(
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.close} data-log="student:end-session-close" onClick={handleCancel} aria-label="Close">✕</button>
        <p className={styles.text}>{t('end_text')}</p>
        <div className={styles.actions}>
          <button className={styles.cancel} data-log="student:end-session-cancel" onClick={handleCancel}>Cancel</button>
          <button className={styles.logout} data-log="student:end-session-confirm" onClick={handleLogOut}>Log Out</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
