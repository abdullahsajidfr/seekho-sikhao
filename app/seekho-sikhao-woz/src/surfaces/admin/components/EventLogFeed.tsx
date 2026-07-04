import styles from './EventLogFeed.module.css';
import type { Session } from '../../../types/session';
import type { EventLogEntry } from '../../../types/admin';

interface Props {
  roomCode: string;
  session: Session | null | undefined;
}

function formatRelativeMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function entryClassName(entry: EventLogEntry, styles: Record<string, string>): string {
  if (entry.label.startsWith('task:')) return styles.taskEvent;
  if (entry.label.startsWith('smileyometer:')) return styles.smiley;
  if (entry.source === 'admin') return styles.manual;
  return styles.auto;
}

export default function EventLogFeed({ session }: Props) {
  const entries: (EventLogEntry & { key: string })[] = session?.eventLog
    ? Object.entries(session.eventLog as Record<string, EventLogEntry>)
        .map(([key, e]) => ({ ...e, key }))
        .sort((a, b) => b.absoluteTime - a.absoluteTime)
    : [];

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.title}>Event Log</p>
        <span className={styles.counter}>{entries.length} events</span>
      </div>
      <div className={styles.feed}>
        {entries.length === 0 && (
          <p className={styles.empty}>No events yet</p>
        )}
        {entries.map(entry => (
          <div key={entry.key} className={`${styles.entry} ${entryClassName(entry, styles)}`}>
            <span className={styles.time}>{formatRelativeMs(entry.relativeMs)}</span>
            <span className={`${styles.sourceBadge} ${entry.source === 'admin' ? styles.admin : styles.app}`}>
              {entry.source === 'admin' ? 'ADMIN' : 'APP'}
            </span>
            <span className={styles.label}>{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
