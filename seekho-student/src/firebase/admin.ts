import { db, firebaseEnabled } from './config';
import { ref, update, push } from 'firebase/database';
import type { EventLogEntry, LogKind } from '../types/admin';

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
    /** Overrides the manual/auto classification (auto-capture passes 'auto'). */
    type?: 'auto' | 'manual';
    kind?: LogKind;
    route?: string;
    target?: string;
    x?: number;
    y?: number;
  } = {}
): void {
  // Observable in dev even without Firebase (demo mode returns below).
  if (__DEV__) console.debug('[autolog]', ctx.kind ?? '', label);
  if (!firebaseEnabled) return;
  const now = Date.now();
  const relativeMs = ctx.sessionStartTime ? now - ctx.sessionStartTime : 0;
  const type = ctx.type ?? (source === 'admin' ? 'manual' : 'auto');

  const entry: EventLogEntry = {
    type,
    label,
    absoluteTime: now,
    relativeMs,
    taskPhase: ctx.activeTask ?? null,
    source,
    // Only attach the interaction fields when present (RTDB rejects `undefined`).
    ...(ctx.kind ? { kind: ctx.kind } : {}),
    ...(ctx.route ? { route: ctx.route } : {}),
    ...(ctx.target ? { target: ctx.target } : {}),
    ...(ctx.x !== undefined ? { x: ctx.x } : {}),
    ...(ctx.y !== undefined ? { y: ctx.y } : {}),
  };

  // Session-scoped events attach to the room; events fired outside any session
  // (e.g. the entry keypad) fall back to a global telemetry bucket.
  const path = roomCode ? `sessions/${roomCode}/eventLog` : `telemetry/${source}/eventLog`;
  push(ref(db, path), entry).catch(() => {});
}

export async function setSmileyometerQuestion(roomCode: string, question: number | null): Promise<void> {
  if (!firebaseEnabled) return;
  await update(ref(db, `sessions/${roomCode}/adminControl`), { smileyometerQuestion: question });
}
