import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { startAdminSession, endAdminSession, setAdminStudentInfo } from '../../../firebase/admin';
import styles from './SessionControl.module.css';
import type { AdminControl } from '../../../types/admin';

interface Props {
  roomCode: string;
  adminControl: AdminControl | null;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function SessionControl({ roomCode, adminControl }: Props) {
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = adminControl?.sessionPhase === 'running';
  const isDone = adminControl?.sessionPhase === 'done';

  useEffect(() => {
    if (adminControl?.studentName && !studentName) setStudentName(adminControl.studentName);
    if (adminControl?.grade && !grade) setGrade(adminControl.grade);
  }, [adminControl?.studentName, adminControl?.grade]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!adminControl?.sessionStartTime) { setElapsed(0); return; }
    const startTime = adminControl.sessionStartTime;
    const update = () => setElapsed(Date.now() - startTime);
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [adminControl?.sessionStartTime]);

  const handleInfoBlur = useCallback(() => {
    setAdminStudentInfo(roomCode, studentName, grade);
  }, [roomCode, studentName, grade]);

  async function handleStart() {
    await startAdminSession(roomCode, studentName.trim(), grade.trim());
  }

  async function handleEnd() {
    await endAdminSession(
      roomCode,
      adminControl?.studentName ?? '',
      adminControl?.grade ?? '',
      adminControl?.sessionStartTime ?? null
    );
    setShowConfirm(false);
  }

  return (
    <div className={styles.panel}>
      <p className={styles.title}>Session Control</p>

      <div className={styles.row}>
        <span className={styles.label}>Student Name</span>
        <input
          className={styles.input}
          placeholder="e.g. Ali"
          data-log="admin:session-student-name"
          value={studentName}
          onChange={e => setStudentName(e.target.value)}
          onBlur={handleInfoBlur}
          disabled={isRunning || isDone}
        />
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Grade</span>
        <select
          className={styles.select}
          data-log="admin:session-grade"
          value={grade}
          onChange={e => setGrade(e.target.value)}
          onBlur={handleInfoBlur}
          disabled={isRunning || isDone}
        >
          <option value="">— select —</option>
          <option value="3">Grade 3</option>
          <option value="4">Grade 4</option>
          <option value="5">Grade 5</option>
          <option value="6">Grade 6</option>
        </select>
      </div>

      {isRunning && (
        <div className={styles.activeBadge}>
          <span className={styles.dot} />
          Session Active
        </div>
      )}

      {adminControl?.sessionStartTime && (
        <div className={styles.clock}>{formatMs(elapsed)}</div>
      )}

      <button
        className={styles.startBtn}
        data-log="admin:session-start"
        onClick={handleStart}
        disabled={isRunning || isDone || !studentName.trim()}
      >
        Start Session
      </button>

      <button
        className={styles.endBtn}
        data-log="admin:session-end"
        onClick={() => setShowConfirm(true)}
        disabled={!isRunning}
      >
        End Session
      </button>

      {showConfirm && createPortal(
        <div className={styles.confirmModal}>
          <div className={styles.confirmCard}>
            <p className={styles.confirmText}>
              End session and export data to Google Sheets?
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} data-log="admin:session-end-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className={styles.confirmOk} data-log="admin:session-end-confirm" onClick={handleEnd}>End Session</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
