import { createPortal } from 'react-dom';
import { logEvent, setSmileyometerQuestion } from '../../../firebase/admin';
import styles from './SmileyometerOverlay.module.css';
import type { AdminControl } from '../../../types/admin';

const QUESTIONS: Record<number, { section: string; text: string }> = {
  1: { section: 'Part A — Seekho Sikhao App', text: 'How did you feel using the app?' },
  2: { section: 'Part A — Seekho Sikhao App', text: 'How easy was it to understand what the app said?' },
  3: { section: 'Part A — Seekho Sikhao App', text: 'Would you use this app for homework?' },
  4: { section: 'Part B — About ChatGPT', text: 'How did you feel using ChatGPT?' },
  5: { section: 'Part B — About ChatGPT', text: 'How easy was it to understand what ChatGPT said?' },
  6: { section: 'Part B — About ChatGPT', text: 'Would you use ChatGPT for homework?' },
};

const FACES = ['😞', '😕', '😐', '🙂', '😄'];

interface Props {
  roomCode: string;
  questionNum: number;
  adminControl?: AdminControl;
}

export default function SmileyometerOverlay({ roomCode, questionNum, adminControl }: Props) {
  const q = QUESTIONS[questionNum];
  if (!q) return null;

  async function handleFace(score: number) {
    logEvent(roomCode, `smileyometer:q${questionNum}:response:${score}`, 'student_app', {
      sessionStartTime: adminControl?.sessionStartTime,
      activeTask: adminControl?.activeTask,
      studentName: adminControl?.studentName,
      grade: adminControl?.grade,
    });
    await setSmileyometerQuestion(roomCode, null);
  }

  return createPortal(
    <div className={styles.backdrop}>
      <div className={styles.overlay}>
        <p className={styles.section}>{q.section}</p>
        <p className={styles.question}>{q.text}</p>
        <div className={styles.faces}>
          {FACES.map((face, i) => (
            <button key={i} className={styles.faceBtn} data-log={`student:smiley-q${questionNum}-face-${i + 1}`} onClick={() => handleFace(i + 1)}>
              {face}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
