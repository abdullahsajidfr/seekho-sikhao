import { db, firebaseEnabled } from './config';
import { ref, update, push } from 'firebase/database';
import type { EventLogEntry, LogSource, LogKind } from '../types/admin';

// ── Admin control writes ───────────────────────────────────────────────

export async function setAdminStudentInfo(
  roomCode: string,
  studentName: string,
  grade: string
): Promise<void> {
  await update(ref(db, `sessions/${roomCode}/adminControl`), { studentName, grade });
}

export async function startAdminSession(
  roomCode: string,
  studentName: string,
  grade: string
): Promise<void> {
  const now = Date.now();
  await update(ref(db, `sessions/${roomCode}/adminControl`), {
    sessionStartTime: now,
    sessionPhase: 'running',
    studentName,
    grade,
  });
  postToSheets({
    type: 'session_start',
    sessionId: roomCode,
    studentName,
    grade,
    startTime: new Date(now).toISOString(),
    date: new Date().toLocaleDateString('en-PK'),
  });
}

export async function endAdminSession(
  roomCode: string,
  studentName: string,
  grade: string,
  sessionStartTime: number | null
): Promise<void> {
  const now = Date.now();
  await update(ref(db, `sessions/${roomCode}/adminControl`), {
    sessionPhase: 'done',
  });
  postToSheets({
    type: 'session_end',
    sessionId: roomCode,
    studentName,
    grade,
    endTime: new Date(now).toISOString(),
    totalDurationMs: sessionStartTime ? now - sessionStartTime : 0,
  });
}

export async function setActiveTask(
  roomCode: string,
  taskId: string | null,
  startTime: number | null
): Promise<void> {
  await update(ref(db, `sessions/${roomCode}/adminControl`), {
    activeTask: taskId,
    activeTaskStartTime: startTime,
  });
}

export async function setSmileyometerQuestion(
  roomCode: string,
  question: number | null
): Promise<void> {
  if (!firebaseEnabled) return;
  await update(ref(db, `sessions/${roomCode}/adminControl`), {
    smileyometerQuestion: question,
  });
}

// ── Event logging ─────────────────────────────────────────────────────

export function logEvent(
  roomCode: string,
  label: string,
  source: LogSource,
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
    ...(ctx.kind   ? { kind: ctx.kind }     : {}),
    ...(ctx.route  ? { route: ctx.route }   : {}),
    ...(ctx.target ? { target: ctx.target } : {}),
    ...(ctx.x !== undefined ? { x: ctx.x }  : {}),
    ...(ctx.y !== undefined ? { y: ctx.y }  : {}),
  };

  // Fire-and-forget Firebase push. Events with a live session attach to it;
  // events fired outside any session (e.g. teacher surface) go to a global bucket.
  const path = roomCode ? `sessions/${roomCode}/eventLog` : `telemetry/${source}/eventLog`;
  push(ref(db, path), entry).catch(console.error);

  // Fire-and-forget Sheets POST
  postToSheets({
    type: 'event',
    sessionId: roomCode || `(${source})`,
    studentName: ctx.studentName ?? '',
    grade: ctx.grade ?? '',
    eventType: source,
    eventLabel: label,
    absoluteTime: new Date(now).toISOString(),
    relativeMs,
    taskPhase: ctx.activeTask ?? 'none',
  });
}

// ── Google Sheets helpers ─────────────────────────────────────────────

function postToSheets(payload: Record<string, unknown>): void {
  const endpoint = import.meta.env.VITE_SHEETS_ENDPOINT;
  if (!endpoint) {
    console.warn('VITE_SHEETS_ENDPOINT not set — skipping Sheets POST');
    return;
  }
  fetch(endpoint, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  }).catch(e => console.error('Sheets POST failed:', e));
}
