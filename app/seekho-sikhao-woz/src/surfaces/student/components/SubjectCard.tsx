import styles from './SubjectCard.module.css';
import type { Subject } from '../../../types/session';

interface SubjectConfig {
  bg: string;
  border: string;
  iconBg: string;
  textColor: string;
  iconType: 'img' | 'text';
  iconSrc?: string;
  iconText?: string;
  iconFont?: string;
}

const SUBJECT_CONFIG: Record<Subject, SubjectConfig> = {
  Mathematics:      { bg: '#FFD2D3', border: '#CE6161', iconBg: '#CE6161', textColor: '#CE6161', iconType: 'img',  iconSrc: '/icons/icon-math.svg' },
  English:          { bg: '#D6F4FF', border: '#0C759E', iconBg: '#0C759E', textColor: '#0C759E', iconType: 'text', iconText: 'Abc',   iconFont: 'Dongle' },
  Science:          { bg: '#FFE1D3', border: '#FF5100', iconBg: '#FF5100', textColor: '#FF5100', iconType: 'img',  iconSrc: '/icons/icon-science.svg' },
  Islamiyat:        { bg: '#E5D3FF', border: '#4E00BA', iconBg: '#4E00BA', textColor: '#4E00BA', iconType: 'img',  iconSrc: '/icons/icon-islamiyat.svg' },
  'Social Studies': { bg: '#FFFDD3', border: '#D6CB01', iconBg: '#D6CB01', textColor: '#D6CB01', iconType: 'img',  iconSrc: '/icons/icon-social.svg' },
  Urdu:             { bg: '#D3FFE4', border: '#009A3B', iconBg: '#009A3B', textColor: '#009A3B', iconType: 'text', iconText: 'اردو',  iconFont: 'Noto Nastaliq Urdu' },
};

interface Props {
  subject: Subject;
  grade?: string;
  onClick: () => void;
}

export default function SubjectCard({ subject, grade = 'Grade 4, Section A', onClick }: Props) {
  const cfg = SUBJECT_CONFIG[subject];

  return (
    <button
      className={styles.card}
      style={{ background: cfg.bg, borderColor: cfg.border }}
      onClick={onClick}
    >
      <div className={styles.iconBox} style={{ background: cfg.iconBg }}>
        {cfg.iconType === 'img' ? (
          <img src={cfg.iconSrc} alt="" className={styles.iconImg} />
        ) : (
          <span
            className={styles.iconText}
            style={{
              fontFamily: cfg.iconFont === 'Noto Nastaliq Urdu'
                ? "'Noto Nastaliq Urdu', sans-serif"
                : "'Dongle', sans-serif",
            }}
          >
            {cfg.iconText}
          </span>
        )}
      </div>
      <div className={styles.textGroup}>
        <span className={styles.subjectName} style={{ color: cfg.textColor }}>{subject}</span>
        <span className={styles.grade}>{grade}</span>
      </div>
    </button>
  );
}
