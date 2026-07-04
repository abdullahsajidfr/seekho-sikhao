import { useState } from 'react';
import { createPortal } from 'react-dom';
import { setSubject as fbSetSubject, setShowEndModal } from '../../../firebase/session';
import SubjectCard from '../components/SubjectCard';
import styles from './SubjectScreen.module.css';
import type { Subject } from '../../../types/session';

const SUBJECTS: Subject[] = [
  'Mathematics', 'English', 'Islamiyat',
  'Science', 'Social Studies', 'Urdu',
];

interface Props {
  roomCode: string;
  studentName: string;
  onSelect: (subject: Subject) => void;
}

export default function SubjectScreen({ roomCode, studentName, onSelect }: Props) {
  const [showSettings, setShowSettings] = useState(false);

  async function handleSelect(subject: Subject) {
    await fbSetSubject(roomCode, subject);
    onSelect(subject);
  }

  async function handleLogOut() {
    setShowSettings(false);
    await setShowEndModal(roomCode, true);
  }

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <img src="/icons/logo.png" alt="Seekho Sikhao" className={styles.logo} />
        <button
          className={styles.settingsBtn}
          aria-label="Settings"
          data-log="student:settings"
          onClick={() => setShowSettings(true)}
        >
          <img src="/icons/settings.svg" alt="" />
        </button>
      </div>

      {/* Greeting + grid */}
      <div className={styles.body}>
        <div className={styles.greeting}>
          <p className={styles.greetName}>Hello{studentName ? `, ${studentName}` : ''}!</p>
          <p className={styles.greetSub}>What would you like to learn today?</p>
        </div>

        <div className={styles.grid}>
          {SUBJECTS.map(subject => (
            <SubjectCard key={subject} subject={subject} onClick={() => handleSelect(subject)} />
          ))}
        </div>
      </div>

      {/* Settings overlay */}
      {showSettings && createPortal(
        <div className={styles.overlayBackdrop} onClick={() => setShowSettings(false)}>
          <div className={styles.settingsCard} onClick={e => e.stopPropagation()}>
            <button className={styles.settingsItem} data-log="student:logout" onClick={handleLogOut}>
              <svg className={styles.settingsIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Log Out</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
