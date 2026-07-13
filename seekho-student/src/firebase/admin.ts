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

  // Also mirror the event to a Google Sheet (one tab per user) when configured.
  logToSheet(roomCode, label, type, source, now, relativeMs, ctx);
}

/**
 * Fire-and-forget mirror of each event to a Google Apps Script web app that
 * writes one worksheet (tab) PER USER inside a single spreadsheet. Set
 * `EXPO_PUBLIC_SHEETS_ENDPOINT` to the deployed /exec URL to enable it; unset =
 * no-op. Never throws / never blocks the UI. See docs/google-sheets-logging.md
 * for the Apps Script to paste + deploy.
 */
function logToSheet(
  roomCode: string,
  label: string,
  type: 'auto' | 'manual',
  source: 'student_app' | 'admin',
  now: number,
  relativeMs: number,
  ctx: {
    studentName?: string;
    grade?: string;
    activeTask?: string | null;
    kind?: LogKind;
    route?: string;
    target?: string;
    x?: number;
    y?: number;
  },
): void {
  const endpoint = process.env.EXPO_PUBLIC_SHEETS_ENDPOINT;
  if (!endpoint) return;
  // One tab per user: prefer the student's name, else the room code.
  const user = (ctx.studentName && ctx.studentName.trim()) || roomCode || 'unknown';
  try {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user,
        roomCode,
        studentName: ctx.studentName ?? '',
        grade: ctx.grade ?? '',
        timestamp: new Date(now).toISOString(),
        relativeMs,
        type,
        source,
        kind: ctx.kind ?? '',
        label,
        route: ctx.route ?? '',
        target: ctx.target ?? '',
        taskPhase: ctx.activeTask ?? '',
        x: ctx.x ?? '',
        y: ctx.y ?? '',
      }),
    }).catch(() => {});
  } catch {
    /* never blocks the UI */
  }
}

export async function setSmileyometerQuestion(roomCode: string, question: number | null): Promise<void> {
  if (!firebaseEnabled) return;
  await update(ref(db, `sessions/${roomCode}/adminControl`), { smileyometerQuestion: question });
}
