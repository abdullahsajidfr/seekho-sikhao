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

/**
 * What the chat input bar hands to `sendStudentMessage`. `audioUris` are LOCAL
 * device file URIs for the recorded voice clips (one per dictation that
 * contributed to the message) — they are persisted best-effort and are NEVER
 * written to the database; the sent message's `audioURL` field holds only a
 * reference (see `ChatMessage.audioURL`).
 */
export interface StudentMessagePayload {
  text: string;
  type: StudentMessageType;
  photoURL?: string;
  voiceTranscript?: string;
  audioUris?: string[];
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  readAloudText?: string;
  type: MessageType;
  photoURL?: string;
  workbookQuestion?: string;
  workbookCorrect?: boolean;
  /** AI message that is a hint (renders in the yellow hint style). */
  isHint?: boolean;
  /** AI message confirming a correct answer (renders in the green style). */
  isCorrect?: boolean;
  /** AI reply whose Urdu audio was pre-synthesised server-side and stored at
   *  `audioClips/{roomCode}/{timestamp}` — play that instead of re-synthesising. */
  audioReady?: boolean;
  /** Reference to a voice message's recorded audio, persisted best-effort
   *  OUTSIDE the session node so clips never bloat session reads: the
   *  top-level RTDB path `voiceClips/{room}/{timestamp}` (children 0..n-1 are
   *  `data:audio/wav` URIs, one per dictation), or a public download URL on
   *  the Supabase backend. Absent when the message is not voice. */
  audioURL?: string;
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
  /** Subject this chat belonged to, so past chats stay scoped to their subject.
   *  Optional for backward-compat with chats archived before this field existed. */
  subject?: Subject;
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
