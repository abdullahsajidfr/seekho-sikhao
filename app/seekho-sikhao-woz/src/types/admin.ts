export interface AdminControl {
  sessionStartTime: number | null;
  activeTask: string | null;
  activeTaskStartTime: number | null;
  sessionPhase: 'idle' | 'running' | 'smileyometer' | 'done';
  smileyometerQuestion: number | null;
  studentName: string;
  grade: string;
}

export interface EventLogEntry {
  type: 'auto' | 'manual';
  label: string;
  absoluteTime: number;
  relativeMs: number;
  taskPhase: string | null;
  source: 'student_app' | 'admin';
}
