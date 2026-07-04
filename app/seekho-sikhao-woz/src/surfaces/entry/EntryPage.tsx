import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomExists } from '../../firebase/session';
import styles from './EntryPage.module.css';

const DIGITS = ['1','2','3','4','5','6','7','8','9','←','0','✓'];

export default function EntryPage() {
  const [code, setCode]   = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleKey(key: string) {
    if (loading) return;
    if (key === '←') {
      setCode((c) => c.slice(0, -1));
      setError('');
    } else if (key === '✓') {
      if (code.length !== 4) return;
      setLoading(true);
      try {
        const exists = await roomExists(code);
        if (exists) {
          sessionStorage.setItem('roomCode', code);
          navigate('/student');
        } else {
          setError('Room not found. Check the code.');
        }
      } finally {
        setLoading(false);
      }
    } else if (code.length < 4) {
      setCode((c) => c + key);
      setError('');
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Seekho Sikhao</h1>
      <p className={styles.sub}>Enter your room code</p>
      <div className={styles.display}>
        {[0,1,2,3].map((i) => (
          <span key={i} className={styles.digit}>{code[i] ?? '–'}</span>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.pad}>
        {DIGITS.map((k) => (
          <button key={k} className={styles.key} onClick={() => handleKey(k)}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
