export interface AdminControl {
  sessionStartTime: number | null;
  activeTask: string | null;
  activeTaskStartTime: number | null;
  sessionPhase: 'idle' | 'running' | 'done';
  smileyometerQuestion: number | null;
  studentName: string;
  grade: string;
}

/** Category of an auto-captured interaction. Mirrors the web logger. */
export type LogKind = 'click' | 'nav' | 'input' | 'submit' | 'screen';

export interface EventLogEntry {
  type: 'auto' | 'manual';
  label: string;
  absoluteTime: number;
  relativeMs: number;
  taskPhase: string | null;
  source: 'student_app' | 'admin';
  /** Present on auto-captured interaction events. */
  kind?: LogKind;
  /** Route/screen the event happened on, e.g. "nav:Student". */
  route?: string;
  /** Best-effort human label of the interacted element or entered value. */
  target?: string;
  /** Coordinates for pointer events. */
  x?: number;
  y?: number;
}
