import { useState } from 'react';
import { setWorkbookActive, sendWorkbookAnswer, setShowEndModal, clearWorkbook } from '../../../firebase/session';
import type { Session } from '../../../types/session';
import styles from './SessionControls.module.css';

interface Props {
  roomCode: string | null;
  session: Session | null;
  onReset: () => void;
  onToggleLanguage: () => void;
}

export default function SessionControls({ roomCode, session, onReset, onToggleLanguage }: Props) {
  const workbookActive    = session?.workbookState.active    ?? false;
  const workbookSubmitted = session?.status === 'workbook_submitted';
  const hintRequested     = session?.workbookState.hintRequested ?? false;
  const canvasImageURL    = session?.workbookState.canvasImageURL ?? null;

  const [answerText, setAnswerText] = useState('');

  async function handleMark(correct: boolean) {
    if (!roomCode || !answerText.trim()) return;
    await sendWorkbookAnswer(roomCode, answerText.trim(), correct);
    setAnswerText('');
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Controls</h2>

      {/* Hint request banner */}
      {hintRequested && (
        <div className={styles.hintAlert}>
          ⚡ Student requested a hint — type your response below
        </div>
      )}

      {/* Submitted canvas + answer grading form */}
      {workbookSubmitted && (
        <div className={styles.submittedWrap}>
          <p className={styles.submittedLabel}>✅ Workbook submitted</p>
          {canvasImageURL
            ? <img src={canvasImageURL} alt="student canvas" className={styles.canvasPreview} />
            : <p className={styles.emptyCanvas}>(canvas was empty)</p>
          }
          <div className={styles.answerForm}>
            <label className={styles.answerLabel}>Student's answer</label>
            <input
              className={styles.answerInput}
              placeholder="e.g. 13"
              value={answerText}
              onChange={e => setAnswerText(e.target.value)}
            />
            <div className={styles.markRow}>
              <button
                className={`${styles.markBtn} ${styles.wrong}`}
                disabled={!answerText.trim()}
                onClick={() => handleMark(false)}
              >
                ✗ Wrong
              </button>
              <button
                className={`${styles.markBtn} ${styles.correct}`}
                disabled={!answerText.trim()}
                onClick={() => handleMark(true)}
              >
                ✓ Correct
              </button>
            </div>
          </div>
        </div>
      )}

      <button className={styles.btn} onClick={onReset} disabled={!roomCode}>Reset Session</button>
      <button
        className={styles.btn}
        onClick={() => roomCode && setShowEndModal(roomCode, true)}
        disabled={!roomCode || !session?.chatHistory}
      >
        End Current Chat
      </button>
      <button
        className={`${styles.btn} ${workbookActive ? styles.active : ''}`}
        onClick={() => roomCode && setWorkbookActive(roomCode, !workbookActive)}
        disabled={!roomCode}
      >
        {workbookActive ? 'Close Workbook' : 'Open Workbook'}
      </button>
      <button
        className={styles.btn}
        onClick={() => roomCode && clearWorkbook(roomCode)}
        disabled={!roomCode || !workbookActive}
      >
        Clear Workbook
      </button>
      <button className={styles.btn} onClick={onToggleLanguage} disabled={!roomCode}>
        Lang: {session?.language === 'ur' ? 'Urdu → EN' : 'EN → Urdu'}
      </button>
    </div>
  );
}
