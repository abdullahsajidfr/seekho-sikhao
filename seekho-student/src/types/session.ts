import type { AdminControl, EventLogEntry } from './admin';

export type Language = 'en' | 'ur';

export type SessionStatus =
  | 'idle'
  | 'student_sent'
  | 'thinking'
  | 'ai_responded'
  | 'workbook_open'
  | 'workbook_submitted'
  | 'session_end';

export type Subject =
  | 'Mathematics'
  | 'English'
  | 'Science'
  | 'Islamiyat'
  | 'Social Studies'
  | 'Urdu';

export type MessageType = 'text' | 'voice' | 'photo' | 'workbook_answer';
export type StudentMessageType = Exclude<MessageType, 'workbook_answer'>;

export type MessageRole = 'student' | 'ai';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  readAloudText?: string;
  type: MessageType;
  photoURL?: string;
  workbookQuestion?: string;
  workbookCorrect?: boolean;
  timestamp: number;
}

export interface StudentMessage {
  text: string;
  type: MessageType;
  photoURL: string | null;
  voiceTranscript: string | null;
  timestamp: number;
}

export interface AiResponse {
  text: string;
  readAloudText?: string;
  attachWorkbook: boolean;
  workbookQuestion: string;
  timestamp: number;
}

export interface WorkbookState {
  active: boolean;
  submitted: boolean;
  hintRequested: boolean;
  canvasImageURL: string | null;
  clearSignal?: number;
}

export interface Greetings {
  Mathematics: string;
  English: string;
  Science: string;
  Islamiyat: string;
  'Social Studies': string;
  Urdu: string;
}

export interface PastChat {
  id: string;
  firstQuestion: string;
  startedAt: number;
  endedAt: number;
  messages: Record<string, ChatMessage>;
}

export interface Session {
  status: SessionStatus;
  language: Language;
  subject: Subject | null;
  studentMessage: StudentMessage;
  aiResponse: AiResponse;
  workbookState: WorkbookState;
  showThinking: boolean;
  showEndModal: boolean;
  greetings: Greetings;
  greetingsReadAloud?: Greetings;
  // Firebase stores pushed lists as keyed objects — convert with Object.values().sort()
  chatHistory: Record<string, ChatMessage>;
  pastChats: Record<string, PastChat> | null;
  adminControl?: AdminControl;
  eventLog?: Record<string, EventLogEntry>;
}
