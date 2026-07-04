import { useState } from 'react';
import styles from './TeacherLoginScreen.module.css';

interface Props { onLogin: () => void }

export default function TeacherLoginScreen({ onLogin }: Props) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (id.trim() && pw.trim()) onLogin();
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.appName}>Seekho Sikhao</h1>
        <h2 className={styles.heading}>Teacher Login</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input className={styles.input} placeholder="Teacher ID" value={id} onChange={(e) => setId(e.target.value)} />
          <input className={styles.input} type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className={styles.btn} type="submit">Log In</button>
        </form>
      </div>
    </div>
  );
}
