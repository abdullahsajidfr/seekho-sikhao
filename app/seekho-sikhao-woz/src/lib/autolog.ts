/**
 * Global interaction auto-logger for every web surface.
 *
 * A single set of capture-phase listeners on `document` records clicks,
 * text input, and form submits; navigation is logged by <AutoLogger/> via the
 * router. Everything funnels through the existing `logEvent` pipeline, so it
 * lands in the same Firebase `eventLog` + Google Sheets as the hand-placed
 * events. Purely additive — existing explicit `log(...)` calls are untouched.
 */
import { logEvent } from '../firebase/admin';
import type { LogSource, LogKind } from '../types/admin';

// ── Ambient context, kept fresh by useLogContext / <AutoLogger> ────────────
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
  source: 'entry',
  route: '/',
  sessionStartTime: null,
  activeTask: null,
  studentName: '',
  grade: '',
};

export function setLogContext(partial: Partial<LogContext>): void {
  Object.assign(ctx, partial);
}

export function sourceForPath(pathname: string): LogSource {
  if (pathname.startsWith('/student')) return 'student_app';
  if (pathname.startsWith('/wizard')) return 'wizard';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/teacher')) return 'teacher';
  return 'entry';
}

// ── Emit ───────────────────────────────────────────────────────────────────
function emit(kind: LogKind, label: string, target: string, x?: number, y?: number): void {
  if (import.meta.env.DEV) console.debug('[autolog]', kind, label, target || '');
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

/** Public helper so <AutoLogger/> can log route changes. */
export function logNavigation(route: string): void {
  emit('nav', `nav:${route}`, route);
}

// ── Target-label derivation ─────────────────────────────────────────────────
const ACTIONABLE = 'button, a, [role="button"], [data-log], input, select, textarea, label, [tabindex]';

function collapse(s: string | null | undefined, max = 48): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function describe(el: Element): string {
  const data = el.getAttribute('data-log');
  if (data) return data;
  const aria = el.getAttribute('aria-label');
  if (aria) return collapse(aria);
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    const f = el as HTMLInputElement;
    return f.name || f.getAttribute('placeholder') || `${tag}[${f.type || tag}]`;
  }
  const title = el.getAttribute('title');
  if (title) return collapse(title);
  const img = el.querySelector('img[alt]');
  if (img) return collapse(img.getAttribute('alt'));
  const text = collapse(el.textContent);
  if (text) return text;
  const id = el.id ? `#${el.id}` : '';
  const cls = typeof el.className === 'string' && el.className ? `.${el.className.split(/\s+/)[0]}` : '';
  return `${tag}${id}${cls}`;
}

/** Nearest actionable ancestor of an event target (or the element itself). */
function actionable(node: EventTarget | null): Element | null {
  if (!(node instanceof Element)) return null;
  return node.closest(ACTIONABLE) ?? node;
}

// ── Listeners ────────────────────────────────────────────────────────────────
let installed = false;

export function installAutoLogger(): () => void {
  if (installed) return () => {};
  installed = true;

  const onClick = (e: MouseEvent) => {
    const el = actionable(e.target);
    if (!el) return;
    emit('click', `click:${describe(el)}`, el.tagName.toLowerCase(), e.clientX, e.clientY);
  };

  const onChange = (e: Event) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
    if (el instanceof HTMLInputElement && (el.type === 'password' || el.type === 'file')) return;
    const value = collapse('value' in el ? el.value : '', 200);
    emit('input', `input:${describe(el)}=${value}`, el.tagName.toLowerCase());
  };

  const onSubmit = (e: Event) => {
    const el = e.target;
    if (!(el instanceof HTMLFormElement)) return;
    emit('submit', `submit:${describe(el)}`, 'form');
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    if (el instanceof HTMLInputElement && el.type === 'password') return;
    const value = collapse(el.value, 200);
    emit('keydown', `submit:${describe(el)}=${value}`, el.tagName.toLowerCase());
  };

  // Capture phase so we still record even when a handler calls stopPropagation.
  document.addEventListener('click', onClick, true);
  document.addEventListener('change', onChange, true);
  document.addEventListener('submit', onSubmit, true);
  document.addEventListener('keydown', onKeydown, true);

  return () => {
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('change', onChange, true);
    document.removeEventListener('submit', onSubmit, true);
    document.removeEventListener('keydown', onKeydown, true);
    installed = false;
  };
}
