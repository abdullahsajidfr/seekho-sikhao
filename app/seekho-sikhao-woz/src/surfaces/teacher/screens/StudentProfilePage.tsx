import { STUDENTS, CHAT_LOGS, TOPICS } from '../data';
import styles from './StudentProfilePage.module.css';

interface Props {
  studentId: string;
  onBack: () => void;
}

export default function StudentProfilePage({ studentId, onBack }: Props) {
  const student  = STUDENTS.find((s) => s.id === studentId);
  const chatLogs = CHAT_LOGS.filter((l) => l.studentId === studentId);
  const topics   = TOPICS.filter((t) => t.studentId === studentId);

  if (!student) return null;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} data-log="teacher:back" onClick={onBack}>←</button>
        <h2 className={styles.title}>{student.name}</h2>
      </div>
      <div className={styles.profile}>
        <div className={styles.avatar}>{student.initials}</div>
        <div>
          <div className={styles.name}>{student.name}</div>
          <div className={styles.meta}>Status: {student.status}</div>
        </div>
      </div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Recent Topics</h3>
        {topics.map((t, i) => (
          <div key={i} className={styles.chip}>{t.topic} ({t.count} msgs)</div>
        ))}
      </div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Chat Logs</h3>
        {chatLogs.map((l, i) => (
          <div key={i} className={styles.logCard}>
            <div className={styles.logQ}>{l.question}</div>
            <div className={styles.logMeta}>{l.time} · {l.hints} hints · {l.completed ? 'Completed' : 'In progress'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
