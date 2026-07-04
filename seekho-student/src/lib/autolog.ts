/**
 * Central interaction auto-logger for the native student app.
 *
 * React Native has no DOM event delegation, so instead of the web logger's
 * capture-phase `document` listeners we expose small helpers
 * (`logTap`/`logNav`/`logInput`/`logSubmit`) that the shared interactive
 * components call from their existing `onPress` handlers. Everything funnels
 * through the same `logEvent` pipeline as the hand-placed `log(...)` calls, so
 * it lands in the same Firebase `sessions/{roomCode}/eventLog`. This mirrors the
 * web logger's semantics, schema, and label vocabulary. Purely additive — the
 * existing explicit `log('screen:...')` calls are untouched.
 */
import { useEffect } from 'react';
import { logEvent } from '../firebase/admin';
import type { LogKind, AdminControl } from '../types/admin';

// The native app only ever logs from the student-facing surface (entry +
// student screens are one app), so `source` is fixed to 'student_app'.
type LogSource = 'student_app' | 'admin';

// ── Ambient context, kept fresh by useLogContext / navigation onStateChange ──
interface LogContext {
  roomCode: string;
  source: LogSource;
  route: string;
  sessionStartTime: number | null;
  activeTask: string | null;
  studentName: string;
  grade: string;
}

const ctx: LogContext = {
  roomCode: '',
  source: 'student_app',
  route: '',
  sessionStartTime: null,
  activeTask: null,
  studentName: '',
  grade: '',
};

export function setLogContext(partial: Partial<LogContext>): void {
  Object.assign(ctx, partial);
}

function collapse(s: string | null | undefined, max = 200): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// ── Emit ─────────────────────────────────────────────────────────────────────
function emit(kind: LogKind, label: string, target?: string, x?: number, y?: number): void {
  logEvent(ctx.roomCode, label, ctx.source, {
    sessionStartTime: ctx.sessionStartTime,
    activeTask: ctx.activeTask,
    studentName: ctx.studentName,
    grade: ctx.grade,
    type: 'auto',
    kind,
    route: ctx.route,
    target,
    x,
    y,
  });
}

/** A meaningful tap. `label` follows the `<surface>:<action>` kebab convention. */
export function logTap(label: string, target?: string, x?: number, y?: number): void {
  emit('click', label, target, x, y);
}

/** A screen/route change. `route` is the already-prefixed label, e.g. "nav:Student". */
export function logNav(route: string): void {
  ctx.route = route;
  emit('nav', route, route);
}

/** Text that was entered (e.g. a chat message). Value is whitespace-collapsed + truncated. */
export function logInput(label: string, value: string): void {
  emit('input', `${label}=${collapse(value, 200)}`);
}

/** A form-style submission (e.g. login). Value is optional. */
export function logSubmit(label: string, value?: string): void {
  emit('submit', value != null ? `${label}=${collapse(value, 200)}` : label);
}

/**
 * Keeps the auto-logger's ambient session context in sync with the student
 * surface. Mirrors the web `useLogContext` so auto-captured events carry the
 * right sessionId, relativeMs, task phase, and student info.
 */
export function useLogContext(
  roomCode: string | null | undefined,
  adminControl: AdminControl | null | undefined,
): void {
  useEffect(() => {
    setLogContext({
      roomCode: roomCode ?? '',
      sessionStartTime: adminControl?.sessionStartTime ?? null,
      activeTask: adminControl?.activeTask ?? null,
      studentName: adminControl?.studentName ?? '',
      grade: adminControl?.grade ?? '',
    });
  }, [
    roomCode,
    adminControl?.sessionStartTime,
    adminControl?.activeTask,
    adminControl?.studentName,
    adminControl?.grade,
  ]);
}
