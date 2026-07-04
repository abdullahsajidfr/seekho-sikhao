import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';
import { useLogContext } from '../../hooks/useLogContext';
import { roomExists } from '../../firebase/session';
import SessionControl from './components/SessionControl';
import TaskTracker from './components/TaskTracker';
import ManualEvents from './components/ManualEvents';
import SmileyometerDelivery from './components/SmileyometerDelivery';
import LiveChatView from './components/LiveChatView';
import EventLogFeed from './components/EventLogFeed';
import styles from './AdminApp.module.css';

export default function AdminApp() {
  const [params] = useSearchParams();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [entryError, setEntryError] = useState('');
  const [checking, setChecking] = useState(false);

  const { session } = useSession(roomCode);
  const adminControl = session?.adminControl;
  useLogContext(roomCode, adminControl);

  if (params.get('key') !== 'ctrl-alt-del') {
    return <div style={{ padding: 32, fontFamily: 'monospace' }}>Access denied.</div>;
  }

  async function handleJoin() {
    const code = inputCode.trim();
    if (code.length !== 4) { setEntryError('Enter a 4-digit room code'); return; }
    setChecking(true);
    setEntryError('');
    const exists = await roomExists(code);
    setChecking(false);
    if (!exists) { setEntryError('Room not found. Check the code.'); return; }
    setRoomCode(code);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Seekho Sikhao Admin</span>
        <span className={styles.headerBadge}>RESEARCHER</span>
        {roomCode && <span className={styles.roomBadge}>Room: {roomCode}</span>}
      </div>

      {!roomCode ? (
        <div className={styles.entryWrap}>
          <div className={styles.entryCard}>
            <p className={styles.entryTitle}>Join Session</p>
            <input
              className={styles.entryInput}
              maxLength={4}
              placeholder="0000"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            {entryError && <p className={styles.entryError}>{entryError}</p>}
            <button
              className={styles.entryBtn}
              onClick={handleJoin}
              disabled={inputCode.length !== 4 || checking}
            >
              {checking ? 'Checking…' : 'Join Session'}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.leftCol}>
            <LiveChatView session={session} />
            <EventLogFeed roomCode={roomCode} session={session} />
          </div>
          <div className={styles.rightCol}>
            <SessionControl roomCode={roomCode} adminControl={adminControl ?? null} />
            <TaskTracker roomCode={roomCode} adminControl={adminControl ?? null} />
            <ManualEvents roomCode={roomCode} adminControl={adminControl ?? null} />
            <SmileyometerDelivery roomCode={roomCode} adminControl={adminControl ?? null} session={session} />
          </div>
        </div>
      )}
    </div>
  );
}
