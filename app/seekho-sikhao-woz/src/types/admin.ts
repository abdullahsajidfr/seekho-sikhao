export interface AdminControl {
  sessionStartTime: number | null;
  activeTask: string | null;
  activeTaskStartTime: number | null;
  sessionPhase: 'idle' | 'running' | 'smileyometer' | 'done';
  smileyometerQuestion: number | null;
  studentName: string;
  grade: string;
}

/** Which surface (and role) an event originated from. */
export type LogSource = 'student_app' | 'admin' | 'wizard' | 'teacher' | 'entry';

/** Category of an auto-captured interaction. */
export type LogKind = 'click' | 'nav' | 'input' | 'submit' | 'keydown' | 'screen';

export interface EventLogEntry {
  type: 'auto' | 'manual';
  label: string;
  absoluteTime: number;
  relativeMs: number;
  taskPhase: string | null;
  source: LogSource;
  /** Present on auto-captured interaction events. */
  kind?: LogKind;
  /** Route the event happened on, e.g. "/student". */
  route?: string;
  /** Best-effort human label of the interacted element. */
  target?: string;
  /** Viewport coordinates for pointer events. */
  x?: number;
  y?: number;
}
