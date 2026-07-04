import { useState, useEffect, useRef } from 'react';
import styles from './LoginScreen.module.css';

interface Props {
  onLogin: (studentId: string) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [id, setId]     = useState('');
  const [pw, setPw]     = useState('');
  const [showPw, setShowPw] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  // Shift the card up when the iOS keyboard appears so the focused input stays visible.
  // Required because html { position: fixed } disables Safari's native scroll-to-input.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function onResize() {
      const page = pageRef.current;
      if (!page) return;
      const focused = document.activeElement as HTMLElement;
      if (!focused || focused.tagName !== 'INPUT') {
        page.style.transform = '';
        return;
      }
      const inputRect = focused.getBoundingClientRect();
      const overlap = inputRect.bottom - vv!.height + 32; // 32px breathing room
      page.style.transform = overlap > 0 ? `translateY(-${overlap}px)` : '';
    }

    function onReset() {
      const page = pageRef.current;
      if (page) page.style.transform = '';
    }

    vv.addEventListener('resize', onResize);
    document.addEventListener('focusout', onReset);
    return () => {
      vv.removeEventListener('resize', onResize);
      document.removeEventListener('focusout', onReset);
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (id.trim() && pw.trim()) onLogin(id.trim());
  }

  return (
    <div className={styles.page} ref={pageRef}>
      <div className={styles.card}>
        <img src="/icons/logo.png" alt="Seekho Sikhao" className={styles.logo} />

        <div className={styles.content}>
          <div className={styles.headingGroup}>
            <h1 className={styles.heading}>Welcome back!</h1>
            <p className={styles.sub}>Log in to continue learning</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <div className={styles.fieldContent}>
                <span className={styles.fieldLabel}>Username</span>
                <input
                  className={styles.fieldInput}
                  placeholder="Type Here"
                  value={id}
                  onChange={e => setId(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldContent}>
                <span className={styles.fieldLabel}>Password</span>
                <input
                  className={styles.fieldInput}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Type Here"
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                />
              </div>
              <button type="button" className={styles.eyeBtn} data-log="student:login-password-toggle" onClick={() => setShowPw(v => !v)}>
                <img src="/icons/eye.svg" alt="show/hide" />
              </button>
            </div>

            <button className={styles.loginBtn} type="submit" data-log="student:login-submit">Log In</button>
          </form>
        </div>
      </div>
    </div>
  );
}
