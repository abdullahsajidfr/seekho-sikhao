import { useState } from 'react';
import { logEvent } from '../../../firebase/admin';
import styles from './ManualEvents.module.css';
import type { AdminControl } from '../../../types/admin';

const QUICK_EVENTS = [
  '👀 Looked at paper',
  '🤔 Showed confusion',
  '🙋 Asked for help',
  '📱 Ignored app',
  '📖 Read response aloud',
  '✍️ Started writing',
  '⏸️ Paused / hesitated',
];

interface Props {
  roomCode: string;
  adminControl: AdminControl | null;
}

export default function ManualEvents({ roomCode, adminControl }: Props) {
  const [noteText, setNoteText] = useState('');
  const [flashedLabel, setFlashedLabel] = useState<string | null>(null);

  function ctx() {
    return {
      sessionStartTime: adminControl?.sessionStartTime,
      activeTask: adminControl?.activeTask,
      studentName: adminControl?.studentName,
      grade: adminControl?.grade,
    };
  }

  function handleQuick(label: string) {
    logEvent(roomCode, label, 'admin', ctx());
    setFlashedLabel(label);
    setTimeout(() => setFlashedLabel(null), 400);
  }

  function handleNote() {
    if (!noteText.trim()) return;
    logEvent(roomCode, `manual:note:${noteText.trim()}`, 'admin', ctx());
    setNoteText('');
  }

  return (
    <div className={styles.panel}>
      <p className={styles.title}>Manual Events</p>
      <div className={styles.quickButtons}>
        {QUICK_EVENTS.map(label => (
          <button
            key={label}
            className={`${styles.quickBtn} ${flashedLabel === label ? styles.flashed : ''}`}
            onClick={() => handleQuick(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.noteRow}>
        <input
          className={styles.noteInput}
          placeholder="Custom observation…"
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNote()}
        />
        <button
          className={styles.noteBtn}
          onClick={handleNote}
          disabled={!noteText.trim()}
        >
          Log Note
        </button>
      </div>
    </div>
  );
}
