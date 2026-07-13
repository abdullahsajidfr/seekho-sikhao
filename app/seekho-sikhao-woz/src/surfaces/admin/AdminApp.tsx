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

  // Session ids created by the student app are username slugs: deriveAccountId
  // (seekho-student/src/firebase/auth.ts) lowercases and maps every run of
  // non-alphanumerics to '-', so "Aisha Khan" and "aisha_khan" both become
  // "aisha-khan". Apply the identical normalization here so a researcher can
  // type the username exactly as the student wrote it.
  const normalizeCode = (raw: string) =>
    raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  async function handleJoin() {
    const code = normalizeCode(inputCode);
    if (code.length < 2) { setEntryError('Enter a room code (4 digits) or a student username'); return; }
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
              maxLength={40}
              placeholder="0000 or username"
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            {entryError && <p className={styles.entryError}>{entryError}</p>}
            <button
              className={styles.entryBtn}
              onClick={handleJoin}
              disabled={normalizeCode(inputCode).length < 2 || checking}
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
