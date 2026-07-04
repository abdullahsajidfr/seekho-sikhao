import { useState, useEffect, useRef } from 'react';
import { setActiveTask, logEvent } from '../../../firebase/admin';
import styles from './TaskTracker.module.css';
import type { AdminControl } from '../../../types/admin';

const TASKS = [
  { id: 'task1', name: 'Log In',           tooltip: 'Log in to the app using the provided details and get started.' },
  { id: 'task2', name: 'Math Question',    tooltip: 'Use the app to help with the bus trip math problem.' },
  { id: 'task3', name: 'Science Question', tooltip: 'Use the app to answer the plant-in-dark-room question.' },
  { id: 'task4', name: 'Find Old Chat',    tooltip: 'Find and open the chat where the math question was asked.' },
  { id: 'task5', name: 'Delete a Chat',    tooltip: 'Delete the chat where the math question was asked.' },
  { id: 'task6', name: 'ChatGPT Task',     tooltip: 'Use the phone/ChatGPT to solve the book-and-change math problem.' },
];

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

export default function TaskTracker({ roomCode, adminControl }: Props) {
  const [activeElapsed, setActiveElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!adminControl?.activeTaskStartTime) { setActiveElapsed(0); return; }
    const startTime = adminControl.activeTaskStartTime;
    const update = () => setActiveElapsed(Date.now() - startTime);
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [adminControl?.activeTaskStartTime]);

  function ctx() {
    return {
      sessionStartTime: adminControl?.sessionStartTime,
      activeTask: adminControl?.activeTask,
      studentName: adminControl?.studentName,
      grade: adminControl?.grade,
    };
  }

  async function handleStart(taskId: string, taskNum: number) {
    if (adminControl?.activeTask) {
      const prevNum = parseInt(adminControl.activeTask.replace('task', ''), 10);
      logEvent(roomCode, `task:${prevNum}:end`, 'admin', ctx());
    }
    logEvent(roomCode, `task:${taskNum}:start`, 'admin', { ...ctx(), activeTask: taskId });
    await setActiveTask(roomCode, taskId, Date.now());
  }

  async function handleEnd(taskNum: number) {
    logEvent(roomCode, `task:${taskNum}:end`, 'admin', ctx());
    await setActiveTask(roomCode, null, null);
  }

  return (
    <div className={styles.panel}>
      <p className={styles.title}>Task Tracker</p>
      <div className={styles.taskList}>
        {TASKS.map((task, i) => {
          const isActive = adminControl?.activeTask === task.id;
          return (
            <div key={task.id} className={`${styles.taskRow} ${isActive ? styles.active : ''}`}>
              <span className={styles.taskNum}>{i + 1}</span>
              <span className={styles.taskName} title={task.tooltip}>{task.name}</span>
              {isActive && (
                <span className={styles.taskTimer}>{formatMs(activeElapsed)}</span>
              )}
              {isActive ? (
                <button className={styles.endBtn} onClick={() => handleEnd(i + 1)}>End</button>
              ) : (
                <button className={styles.startBtn} onClick={() => handleStart(task.id, i + 1)}>Start</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
