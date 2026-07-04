import { CLASSES } from '../data';
import styles from './TeacherDashboard.module.css';

interface Props {
  onSelectClass: (id: string) => void;
  onGuardrails: () => void;
}

export default function TeacherDashboard({ onSelectClass, onGuardrails }: Props) {
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <h1 className={styles.appName}>Seekho Sikhao</h1>
        <button className={styles.configBtn} data-log="teacher:nav-ai-config" onClick={onGuardrails}>AI Configuration</button>
      </div>
      <div className={styles.welcome}>
        <h2 className={styles.greeting}>Welcome back, Teacher!</h2>
        <div className={styles.stats}>
          <div className={styles.stat}><span className={styles.statNum}>42</span><span>Active today</span></div>
          <div className={styles.stat}><span className={styles.statNum}>127</span><span>Total sessions</span></div>
          <div className={styles.stat}><span className={styles.statNum}>8</span><span>Need attention</span></div>
        </div>
      </div>
      <h3 className={styles.sectionTitle}>Your Classes</h3>
      <div className={styles.classList}>
        {CLASSES.map((cls) => (
          <button key={cls.id} className={styles.classCard} data-log={`teacher:class-${cls.id}`} onClick={() => onSelectClass(cls.id)}>
            <div>
              <div className={styles.className}>{cls.name}</div>
              <div className={styles.classMeta}>{cls.students} students · {cls.active} active · {cls.struggling} struggling</div>
            </div>
            <span className={styles.arrow}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
