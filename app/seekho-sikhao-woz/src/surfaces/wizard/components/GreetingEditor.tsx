import { useState } from 'react';
import type { Greetings } from '../../../types/session';
import styles from './GreetingEditor.module.css';

const SUBJECTS = ['Mathematics', 'English', 'Science', 'Islamiyat', 'Social Studies', 'Urdu'] as const;

interface Props {
  greetings: Greetings | null;
  onChange: (g: Greetings) => void;
  onSave: () => Promise<void>;
}

export default function GreetingEditor({ greetings, onChange, onSave }: Props) {
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Edit Greetings</h2>
      <div className={styles.list}>
        {SUBJECTS.map((s) => (
          <label key={s} className={styles.row}>
            <span className={styles.subject}>{s}</span>
            <textarea
              className={styles.input}
              value={greetings?.[s] ?? ''}
              rows={2}
              onChange={(e) => {
                if (!greetings) return;
                onChange({ ...greetings, [s]: e.target.value });
              }}
            />
          </label>
        ))}
      </div>
      <button className={styles.saveBtn} data-log="wizard:save-greetings" onClick={handleSave}>
        {saved ? 'Saved ✓' : 'Save Greetings'}
      </button>
    </div>
  );
}
