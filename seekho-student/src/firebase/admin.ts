import { db, firebaseEnabled } from './config';
import { ref, update, push } from 'firebase/database';
import type { EventLogEntry } from '../types/admin';

/**
 * Minimal admin/event-logging surface used by the student app. Only `logEvent`
 * and `setSmileyometerQuestion` are needed here; the full wizard/admin controls
 * live in the web surface. Every write is a no-op without Firebase credentials.
 */

export function logEvent(
  roomCode: string,
  label: string,
  source: 'student_app' | 'admin',
  ctx: {
    sessionStartTime?: number | null;
    activeTask?: string | null;
    studentName?: string;
    grade?: string;
  } = {}
): void {
  if (!firebaseEnabled) return;
  const now = Date.now();
  const relativeMs = ctx.sessionStartTime ? now - ctx.sessionStartTime : 0;

  const entry: EventLogEntry = {
    type: source === 'admin' ? 'manual' : 'auto',
    label,
    absoluteTime: now,
    relativeMs,
    taskPhase: ctx.activeTask ?? null,
    source,
  };

  push(ref(db, `sessions/${roomCode}/eventLog`), entry).catch(() => {});
}

export async function setSmileyometerQuestion(roomCode: string, question: number | null): Promise<void> {
  if (!firebaseEnabled) return;
  await update(ref(db, `sessions/${roomCode}/adminControl`), { smileyometerQuestion: question });
}
