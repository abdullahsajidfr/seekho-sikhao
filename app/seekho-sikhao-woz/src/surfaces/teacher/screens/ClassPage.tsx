import { STUDENTS } from '../data';
import styles from './ClassPage.module.css';

interface Props {
  classId: string;
  onSelectStudent: (id: string) => void;
  onBack: () => void;
}

export default function ClassPage({ classId, onSelectStudent, onBack }: Props) {
  const students = STUDENTS.filter((s) => s.classId === classId);

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} data-log="teacher:back" onClick={onBack}>←</button>
        <h2 className={styles.title}>Students</h2>
      </div>
      <div className={styles.list}>
        {students.map((s) => (
          <button key={s.id} className={styles.card} data-log={`teacher:student-${s.id}`} onClick={() => onSelectStudent(s.id)}>
            <div className={styles.avatar}>{s.initials}</div>
            <div>
              <div className={styles.name}>{s.name}</div>
              <div className={`${styles.status} ${styles[s.status.replace('-', '')]}`}>{s.status}</div>
            </div>
            <span className={styles.arrow}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
