import { useEffect, useRef } from 'react';
import styles from './LiveChatView.module.css';
import type { Session } from '../../../types/session';

interface Props {
  session: Session | null | undefined;
}

export default function LiveChatView({ session }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = session?.chatHistory
    ? Object.values(session.chatHistory).sort((a, b) => a.timestamp - b.timestamp)
    : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>Live Chat (read-only)</p>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.empty}>No messages yet</p>
        )}
        {messages.map((msg, i) => (
          <div key={msg.id ?? i} className={`${styles.messageRow} ${msg.role === 'student' ? styles.student : styles.ai}`}>
            <div className={`${styles.bubble} ${msg.role === 'student' ? styles.student : styles.ai}`}>
              {msg.type === 'photo' && msg.photoURL
                ? <img src={msg.photoURL} alt="photo" className={styles.photoThumb} />
                : msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
