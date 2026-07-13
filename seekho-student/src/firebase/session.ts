import { db, firebaseEnabled } from './config';
import { ref, set, update, push, get, onValue, off } from 'firebase/database';
import type { Session, AiResponse, Greetings, StudentMessagePayload, ChatMessage } from '../types/session';
import type { AdminControl } from '../types/admin';
import { demoSession } from './demo';
import { triggerTutor } from '../lib/tutor';
import { voiceClipRef, persistVoiceClips } from './storage';
import { logEvent } from './admin';

// ── Helpers ───────────────────────────────────────────────────────────

export const sessionRef = (roomCode: string) => ref(db, `sessions/${roomCode}`);

// ── Room management ───────────────────────────────────────────────────

export async function generateRoomCode(): Promise<string> {
  if (!firebaseEnabled) return String(Math.floor(1000 + Math.random() * 9000));
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const snap = await get(sessionRef(code));
    if (!snap.exists()) return code;
  }
  throw new Error('Could not generate unique room code');
}

export async function createSession(roomCode: string): Promise<void> {
  if (!firebaseEnabled) return;
  const initial: Omit<Session, 'chatHistory' | 'eventLog'> & { chatHistory: null; adminControl: AdminControl } = {
    status: 'idle',
    language: 'ur',
    subject: null,
    studentMessage: { text: '', type: 'text', photoURL: null, voiceTranscript: null, timestamp: 0 },
    aiResponse: { text: '', attachWorkbook: false, workbookQuestion: '', timestamp: 0 },
    workbookState: { active: false, submitted: false, hintRequested: false, canvasImageURL: null },
    showThinking: false,
    showEndModal: false,
    greetings: {
      Mathematics: 'Assalamu Alaikum! Aaj Maths mein kya seekhna chahte ho?',
      English: 'Assalamu Alaikum! Aaj English mein kya poochna chahte ho?',
      Science: 'Assalamu Alaikum! Aaj Science ka koi sawaal hai?',
      Islamiyat: 'Assalamu Alaikum! Aaj Islamiyat mein kya samajhna hai?',
      'Social Studies': 'Assalamu Alaikum! Aaj Social Studies ka koi sawaal?',
      Urdu: 'السلام علیکم! آج اردو میں کیا سیکھنا ہے؟',
    },
    greetingsReadAloud: {
      Mathematics: 'السلام علیکم! آج Maths میں کیا سیکھنا چاہتے ہو؟',
      English: 'السلام علیکم! آج English میں کیا پوچھنا چاہتے ہو؟',
      Science: 'السلام علیکم! آج Science کا کوئی سوال ہے؟',
      Islamiyat: 'السلام علیکم! آج Islamiyat میں کیا سمجھنا ہے؟',
      'Social Studies': 'السلام علیکم! آج Social Studies کا کوئی سوال؟',
      Urdu: 'السلام علیکم! آج اردو میں کیا سیکھنا ہے؟',
    },
    chatHistory: null,
    pastChats: null,
    adminControl: {
      sessionStartTime: null,
      activeTask: null,
      activeTaskStartTime: null,
      sessionPhase: 'idle',
      smileyometerQuestion: null,
      studentName: '',
      grade: '',
    },
  };
  await set(sessionRef(roomCode), initial);
}

export async function roomExists(roomCode: string): Promise<boolean> {
  if (!firebaseEnabled) return true;
  const snap = await get(sessionRef(roomCode));
  return snap.exists();
}

export async function resetSession(roomCode: string): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), {
    status: 'idle',
    subject: null,
    studentMessage: { text: '', type: 'text', photoURL: null, voiceTranscript: null, timestamp: 0 },
    aiResponse: { text: '', attachWorkbook: false, workbookQuestion: '', timestamp: 0 },
    workbookState: { active: false, submitted: false, hintRequested: false, canvasImageURL: null },
    showThinking: false,
    showEndModal: false,
    chatHistory: null,
    pastChats: null,
  });
}

export async function archiveCurrentChat(roomCode: string, chatName?: string): Promise<void> {
  if (!firebaseEnabled) return;
  const snap = await get(ref(db, `sessions/${roomCode}/chatHistory`));
  if (!snap.exists()) return;

  const messages = snap.val() as Record<string, ChatMessage>;
  const sorted = Object.values(messages).sort((a, b) => a.timestamp - b.timestamp);
  const firstStudent = sorted.find((m) => m.role === 'student');
  const displayName = chatName || firstStudent?.text || 'New Chat';

  // Tag the archived chat with the subject it belonged to so Past Questions stay
  // scoped per subject (a Maths chat must not appear under English).
  const subjSnap = await get(ref(db, `sessions/${roomCode}/subject`));
  const subject = subjSnap.val() as string | null;

  const pastChatsRef = ref(db, `sessions/${roomCode}/pastChats`);
  const newRef = push(pastChatsRef);
  await set(newRef, {
    id: newRef.key,
    firstQuestion: displayName,
    ...(subject ? { subject } : {}),
    startedAt: sorted[0]?.timestamp ?? Date.now(),
    endedAt: Date.now(),
    messages,
  });

  await update(sessionRef(roomCode), {
    chatHistory: null,
    status: 'idle',
    showThinking: false,
    workbookState: { active: false, submitted: false, hintRequested: false, canvasImageURL: null },
  });
}

// ── Student writes ────────────────────────────────────────────────────

export async function setSubject(roomCode: string, subject: string): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), { subject, status: 'idle' });
}

export async function sendStudentMessage(
  roomCode: string,
  payload: StudentMessagePayload
): Promise<void> {
  if (!firebaseEnabled) return;
  // Pull `audioUris` out explicitly: they are LOCAL file URIs and must never be
  // written to the database — only the `audioURL` reference is persisted.
  const { text, type, photoURL, voiceTranscript, audioUris } = payload;
  const timestamp = Date.now();
  const hasClips = type === 'voice' && !!audioUris?.length;
  const historyRef = ref(db, `sessions/${roomCode}/chatHistory`);
  // The clip reference is computable synchronously (voiceClips/{room}/{ts} or a
  // deterministic Supabase URL), so it rides the INITIAL message push — no
  // back-patch that could race an archive/clear and resurrect a deleted message.
  await push(historyRef, {
    role: 'student',
    text,
    type,
    photoURL: photoURL ?? null,
    ...(hasClips ? { audioURL: voiceClipRef(roomCode, timestamp) } : {}),
    timestamp,
  });
  await update(sessionRef(roomCode), {
    studentMessage: {
      text,
      type,
      timestamp,
      photoURL: photoURL ?? null,
      voiceTranscript: voiceTranscript ?? null,
    },
    status: 'student_sent',
    showThinking: true, // waiting for the AI reply — dots show until it lands
  });
  // Kick the server-side AI tutor to read this message and reply (Item J).
  // This fires BEFORE the (slow, optional) audio persistence below so tutor
  // timing is unchanged whether or not the child spoke their question.
  triggerTutor(roomCode);

  // Best-effort voice-audio persistence into the side path the message already
  // references. A failure must NEVER block or break the chat — it is caught and
  // logged as `voice:upload-failed` so the dangling reference stays explainable
  // in the research data.
  if (hasClips) {
    persistVoiceClips(roomCode, audioUris!, timestamp).catch(() => {
      logEvent(roomCode, 'voice:upload-failed', 'student_app', {});
    });
  }
}

export async function sendGreeting(roomCode: string, text: string, readAloudText?: string): Promise<void> {
  if (!firebaseEnabled) return;
  const historyRef = ref(db, `sessions/${roomCode}/chatHistory`);
  await push(historyRef, {
    role: 'ai',
    text,
    ...(readAloudText ? { readAloudText } : {}),
    type: 'text',
    timestamp: Date.now(),
  });
}

export async function sendWorkbookAnswer(roomCode: string, answer: string, correct: boolean): Promise<void> {
  if (!firebaseEnabled) return;
  const historyRef = ref(db, `sessions/${roomCode}/chatHistory`);
  await push(historyRef, {
    role: 'student',
    text: answer,
    type: 'workbook_answer',
    workbookCorrect: correct,
    timestamp: Date.now(),
  });
  await update(sessionRef(roomCode), {
    'workbookState/submitted': false,
    'workbookState/canvasImageURL': null,
    status: 'ai_responded',
  });
}

export async function clearWorkbook(roomCode: string): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), {
    'workbookState/submitted': false,
    'workbookState/canvasImageURL': null,
    'workbookState/clearSignal': Date.now(),
  });
}

export async function requestHint(roomCode: string): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), { 'workbookState/hintRequested': true, showThinking: true });
  // Ask the AI tutor to produce a hint (Item J).
  triggerTutor(roomCode);
}

export async function submitWorkbook(roomCode: string, canvasImageURL?: string): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), {
    workbookState: {
      active: true,
      submitted: true,
      hintRequested: false,
      canvasImageURL: canvasImageURL ?? null,
    },
    status: 'workbook_submitted',
    showThinking: true,
  });
  // Ask the AI tutor to grade the submitted working (Item J).
  triggerTutor(roomCode);
}

export async function endSession(roomCode: string): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), { status: 'session_end', showEndModal: false });
}

// ── Wizard writes ─────────────────────────────────────────────────────

export async function sendAiResponse(roomCode: string, response: AiResponse): Promise<void> {
  if (!firebaseEnabled) return;
  const timestamp = Date.now();
  const historyRef = ref(db, `sessions/${roomCode}/chatHistory`);
  await push(historyRef, {
    role: 'ai',
    text: response.text,
    ...(response.readAloudText ? { readAloudText: response.readAloudText } : {}),
    type: 'text',
    workbookQuestion: response.attachWorkbook ? response.workbookQuestion : null,
    timestamp,
  });
  await update(sessionRef(roomCode), {
    aiResponse: { ...response, timestamp },
    status: 'ai_responded',
    showThinking: false,
    'workbookState/hintRequested': false,
  });
}

export async function setThinking(roomCode: string, value: boolean): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), { showThinking: value });
}

export async function setWorkbookActive(roomCode: string, active: boolean): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), {
    workbookState: { active, submitted: false },
    status: active ? 'workbook_open' : 'ai_responded',
    ...(active ? { showEndModal: false } : {}),
  });
}

export async function setLanguage(roomCode: string, language: 'en' | 'ur'): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), { language });
}

/** Store the child's name on the session (used for logging + the Sheets tab). */
export async function setStudentIdentity(roomCode: string, studentName: string): Promise<void> {
  if (!firebaseEnabled) return;
  await update(ref(db, `sessions/${roomCode}/adminControl`), { studentName });
}

export async function setShowEndModal(roomCode: string, show: boolean): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), { showEndModal: show });
}

export async function saveGreetings(roomCode: string, greetings: Greetings): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), { greetings });
}

export async function resumePastChat(roomCode: string, chatId: string): Promise<void> {
  if (!firebaseEnabled) return;
  const snap = await get(ref(db, `sessions/${roomCode}/pastChats/${chatId}/messages`));
  if (!snap.exists()) return;

  const messages = snap.val();
  await set(ref(db, `sessions/${roomCode}/pastChats/${chatId}`), null);
  await update(sessionRef(roomCode), {
    chatHistory: messages,
    status: 'idle',
    showThinking: false,
    workbookState: { active: false, submitted: false, hintRequested: false, canvasImageURL: null },
  });
}

export async function clearCurrentChat(roomCode: string): Promise<void> {
  if (!firebaseEnabled) return;
  await update(sessionRef(roomCode), { chatHistory: null, status: 'idle', showThinking: false });
}

export async function renamePastChat(roomCode: string, chatId: string, newName: string): Promise<void> {
  if (!firebaseEnabled) return;
  await update(ref(db, `sessions/${roomCode}/pastChats/${chatId}`), { firstQuestion: newName });
}

export async function deletePastChat(roomCode: string, chatId: string): Promise<void> {
  if (!firebaseEnabled) return;
  await set(ref(db, `sessions/${roomCode}/pastChats/${chatId}`), null);
}

// ── Real-time listener ────────────────────────────────────────────────

export function subscribeToSession(
  roomCode: string,
  callback: (session: Session | null) => void
): () => void {
  if (!firebaseEnabled) {
    callback(demoSession());
    return () => {};
  }
  const r = sessionRef(roomCode);
  onValue(r, (snap) => callback(snap.val() as Session | null));
  return () => off(r);
}
