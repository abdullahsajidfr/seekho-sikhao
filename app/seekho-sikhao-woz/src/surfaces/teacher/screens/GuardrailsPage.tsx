import { useState } from 'react';
import styles from './GuardrailsPage.module.css';

interface Props { onBack: () => void }

export default function GuardrailsPage({ onBack }: Props) {
  const [mode,      setMode]      = useState<'direct' | 'step-by-step'>('direct');
  const [maxHints,  setMaxHints]  = useState(3);
  const [topics,    setTopics]    = useState('');
  const [files,     setFiles]     = useState<string[]>([]);
  const [toast,     setToast]     = useState(false);
  const [testModal, setTestModal] = useState(false);

  function handleSave() {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setFiles((f) => [...f, file.name]);
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} data-log="teacher:back" onClick={onBack}>←</button>
        <h2 className={styles.title}>AI Configuration</h2>
      </div>
      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.label}>Response Mode</h3>
          <div className={styles.chipRow}>
            <button className={`${styles.chip} ${mode === 'direct' ? styles.selected : ''}`} data-log="teacher:mode-direct" onClick={() => setMode('direct')}>Direct</button>
            <button className={`${styles.chip} ${mode === 'step-by-step' ? styles.selected : ''}`} data-log="teacher:mode-step-by-step" onClick={() => setMode('step-by-step')}>Step-by-step</button>
          </div>
        </section>
        <section className={styles.section}>
          <h3 className={styles.label}>Max Hints per Session: {maxHints}</h3>
          <input type="range" min={0} max={5} value={maxHints} onChange={(e) => setMaxHints(Number(e.target.value))} />
        </section>
        <section className={styles.section}>
          <h3 className={styles.label}>Topic Restrictions</h3>
          <textarea className={styles.textarea} rows={3} value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Enter topics to restrict..." />
        </section>
        <section className={styles.section}>
          <h3 className={styles.label}>Curriculum Files</h3>
          <div className={styles.fileList}>
            {files.map((f, i) => <span key={i} className={styles.fileChip}>{f}</span>)}
          </div>
          <label className={styles.addFile}>
            + Add File
            <input type="file" style={{ display: 'none' }} onChange={handleFile} />
          </label>
        </section>
        <button className={styles.testBtn} data-log="teacher:test-ai" onClick={() => setTestModal(true)}>Test AI Agent</button>
        <button className={styles.saveBtn} data-log="teacher:save-config" onClick={handleSave}>Save Configuration</button>
        {toast && <div className={styles.toast}>Saved ✓</div>}
        {testModal && (
          <div className={styles.overlay}>
            <div className={styles.modal}>
              <p>AI configuration saved. Test responses will use these settings.</p>
              <button className={styles.closeBtn} onClick={() => setTestModal(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
