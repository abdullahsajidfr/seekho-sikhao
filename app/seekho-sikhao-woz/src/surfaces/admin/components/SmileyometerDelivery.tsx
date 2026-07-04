import { useMemo } from 'react';
import { setSmileyometerQuestion } from '../../../firebase/admin';
import styles from './SmileyometerDelivery.module.css';
import type { AdminControl, EventLogEntry } from '../../../types/admin';
import type { Session } from '../../../types/session';

interface Props {
  roomCode: string;
  adminControl: AdminControl | null;
  session: Session | null | undefined;
}

export default function SmileyometerDelivery({ roomCode, adminControl, session }: Props) {
  const answeredQuestions = useMemo(() => {
    if (!session?.eventLog) return new Set<number>();
    const answered = new Set<number>();
    Object.values(session.eventLog as Record<string, EventLogEntry>).forEach(entry => {
      const match = entry.label.match(/^smileyometer:q(\d+):response:/);
      if (match) answered.add(parseInt(match[1], 10));
    });
    return answered;
  }, [session?.eventLog]);

  const currentQ = adminControl?.smileyometerQuestion ?? null;

  function renderBtn(qNum: number) {
    const isShowing = currentQ === qNum;
    const isAnswered = answeredQuestions.has(qNum);
    return (
      <button
        key={qNum}
        className={`${styles.qBtn} ${isAnswered ? styles.answered : ''} ${isShowing ? styles.showing : ''}`}
        disabled={isShowing}
        data-log={`admin:smiley-send-q${qNum}`}
        onClick={() => setSmileyometerQuestion(roomCode, qNum)}
      >
        Q{qNum}{isAnswered && <span className={styles.check}> ✓</span>}
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.title}>Smileyometer</p>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Part A — App</p>
        <div className={styles.btns}>
          {[1, 2, 3].map(renderBtn)}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Part B — ChatGPT</p>
        <div className={styles.btns}>
          {[4, 5, 6].map(renderBtn)}
        </div>
      </div>

      <p className={styles.note}>
        Questions appear one at a time on the student's iPad. Student must tap a face to dismiss.
      </p>
    </div>
  );
}
