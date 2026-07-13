import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TUTOR_SYSTEM_PROMPT } from './_tutorPrompt.js';
import { subjectGuide } from './_subjectGuides.js';
import { synthesizeSpeech } from './_tts.js';
import { upliftKeys } from './_uplift.js';
import { logUsage } from './_usage.js';

/**
 * AI Tutor (auto mode) — replaces the human "wizard".
 *
 * A client POSTs { roomCode } after every student action. We read the shared
 * session from Firebase RTDB (REST, no auth — rules are open), decide which of
 * the three triggers fired (chat / workbook submit / hint), call Gemini
 * (gemini-2.5-flash) with the scaffolding system prompt + structured-JSON
 * output, then write the tutor's reply back into the session over RTDB REST.
 */

// ── Config ────────────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = 'gemini-2.0-flash';

const LLM_TIMEOUT_MS = 30_000;
const IMAGE_TIMEOUT_MS = 15_000;
const RTDB_TIMEOUT_MS = 10_000;

// ── Loose shapes for the raw RTDB session JSON ─────────────────────────
interface RawChatMessage {
  role?: 'student' | 'ai';
  text?: string;
  readAloudText?: string;
  type?: string;
  photoURL?: string | null;
  workbookQuestion?: string | null;
  workbookCorrect?: boolean;
  timestamp?: number;
}
interface RawWorkbookState {
  active?: boolean;
  submitted?: boolean;
  hintRequested?: boolean;
  canvasImageURL?: string | null;
}
interface RawAdminControl {
  responseMode?: 'direct' | 'step-by-step';
  difficulty?: number;
  studentName?: string;
  grade?: string;
  [k: string]: unknown;
}
interface RawSession {
  status?: string;
  language?: string;
  subject?: string | null;
  studentMessage?: { text?: string; type?: string; photoURL?: string | null; voiceTranscript?: string | null };
  aiResponse?: { workbookQuestion?: string };
  workbookState?: RawWorkbookState;
  chatHistory?: Record<string, RawChatMessage> | null;
  adminControl?: RawAdminControl;
}

// The structured object the LLM must return.
interface TutorOutput {
  text: string;
  readAloudText: string;
  attachWorkbook: boolean;
  workbookQuestion: string;
  isHint: boolean;
  isCorrect: boolean;
  // workbook-submit path only: the child's transcribed answer, for the bubble.
  studentAnswer?: string;
}

// Provider-neutral conversation turn.
interface Turn {
  role: 'user' | 'model';
  text: string;
  image?: InlineImage;
}
interface InlineImage {
  mimeType: string;
  base64: string;
}

type Trigger = 'chat' | 'workbook' | 'hint';

// ── Small fetch-with-timeout helper ────────────────────────────────────
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── RTDB REST helpers ──────────────────────────────────────────────────
function dbBase(): string {
  const raw = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || '';
  return raw.replace(/\/+$/, '');
}

async function rtdbGet(path: string): Promise<unknown> {
  const res = await fetchWithTimeout(`${dbBase()}/${path}.json`, { method: 'GET' }, RTDB_TIMEOUT_MS);
  if (!res.ok) throw new Error(`RTDB GET ${path} failed: ${res.status} ${await safeText(res)}`);
  return res.json();
}

async function rtdbPost(path: string, body: unknown): Promise<void> {
  const res = await fetchWithTimeout(
    `${dbBase()}/${path}.json`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    RTDB_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`RTDB POST ${path} failed: ${res.status} ${await safeText(res)}`);
}

async function rtdbPatch(path: string, body: unknown): Promise<void> {
  const res = await fetchWithTimeout(
    `${dbBase()}/${path}.json`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    RTDB_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`RTDB PATCH ${path} failed: ${res.status} ${await safeText(res)}`);
}

async function rtdbPut(path: string, body: unknown): Promise<void> {
  const res = await fetchWithTimeout(
    `${dbBase()}/${path}.json`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    RTDB_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`RTDB PUT ${path} failed: ${res.status} ${await safeText(res)}`);
}

/**
 * Pre-synthesise the reply's Urdu audio and store it (base64 MP3) at a separate
 * top-level path keyed by the AI message timestamp — NOT under sessions/{room},
 * so the live session listener never pulls the heavy clip. The client reads it
 * once (by timestamp) and plays instantly, so the voice lands WITH the text
 * instead of a synthesis round-trip later. Best-effort: returns false on any
 * failure and the client falls back to the on-demand /api/tts path.
 */
async function preSynthesizeClip(roomCode: string, timestamp: number, readAloudText: string): Promise<boolean> {
  if (upliftKeys().length === 0 || !readAloudText.trim()) return false;
  const started = Date.now();
  try {
    const mp3 = await synthesizeSpeech(readAloudText);
    await rtdbPut(`audioClips/${roomCode}/${timestamp}`, { mime: 'audio/mpeg', data: mp3.toString('base64') });
    await logUsage({ ts: started, api: 'tts', model: 'uplift-tts', ok: true, ms: Date.now() - started, chars: readAloudText.length, roomCode });
    return true;
  } catch (e) {
    console.error(`[tutor] pre-synthesis failed room=${roomCode}: ${e instanceof Error ? e.message : String(e)}`);
    await logUsage({ ts: started, api: 'tts', model: 'uplift-tts', ok: false, ms: Date.now() - started, chars: readAloudText.length, roomCode });
    return false;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return '';
  }
}

// ── Image → base64 for vision ──────────────────────────────────────────
async function fetchImageInline(url: string | null | undefined): Promise<InlineImage | null> {
  if (!url) return null;
  try {
    // Already a data URL — parse it directly, no network needed.
    const dataMatch = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url);
    if (dataMatch) {
      const mimeType = dataMatch[1] || 'image/png';
      const isB64 = Boolean(dataMatch[2]);
      const payload = dataMatch[3] ?? '';
      const base64 = isB64 ? payload : Buffer.from(decodeURIComponent(payload)).toString('base64');
      return { mimeType, base64 };
    }
    if (!/^https?:\/\//.test(url)) return null;
    const res = await fetchWithTimeout(url, { method: 'GET' }, IMAGE_TIMEOUT_MS);
    if (!res.ok) {
      console.error(`[tutor] image fetch failed: ${res.status} ${url.slice(0, 120)}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() || mimeFromUrl(url);
    return { mimeType, base64: buf.toString('base64') };
  } catch (e) {
    console.error(`[tutor] image fetch error: ${String(e)}`);
    return null;
  }
}

function mimeFromUrl(url: string): string {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

// ── Trigger detection ──────────────────────────────────────────────────
function detectTrigger(session: RawSession): Trigger | null {
  const wb = session.workbookState ?? {};
  // Hint is set without changing status, so check it first.
  if (wb.hintRequested === true) return 'hint';
  if (session.status === 'workbook_submitted' || wb.submitted === true) return 'workbook';
  if (session.status === 'student_sent') return 'chat';
  return null;
}

// Latest practice question the child is working on.
function activeWorkbookQuestion(msgs: RawChatMessage[], session: RawSession): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const q = msgs[i].workbookQuestion;
    if (q && q.trim()) return q.trim();
  }
  return (session.aiResponse?.workbookQuestion ?? '').trim();
}

// ── Build the provider-neutral conversation ────────────────────────────
async function buildTurns(
  msgs: RawChatMessage[],
  session: RawSession,
  trigger: Trigger,
  workbookQ: string,
): Promise<Turn[]> {
  const turns: Turn[] = [];
  const lastIdx = msgs.length - 1;

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const role: 'user' | 'model' = m.role === 'ai' ? 'model' : 'user';
    let text = (m.text ?? '').trim();

    if (m.type === 'workbook_answer') {
      const verdict = m.workbookCorrect === true ? 'correct' : m.workbookCorrect === false ? 'not correct' : '';
      text = `[Workbook answer: ${text || 'my working'}${verdict ? ` — marked ${verdict}` : ''}]`;
    }

    // Attach the current homework photo (vision) only for the child's latest
    // message when this is a plain chat trigger; older photos become a marker.
    let image: InlineImage | undefined;
    if (m.type === 'photo' && m.photoURL) {
      if (i === lastIdx && trigger === 'chat') {
        image = (await fetchImageInline(m.photoURL)) ?? undefined;
        if (!text) text = '[I sent a photo of my homework. Please look at it.]';
      } else if (!text) {
        text = '[I shared a photo of my homework earlier.]';
      }
    }

    // Fall back to the stored voice transcript if a voice bubble has no text.
    if (!text && m.type === 'voice' && i === lastIdx) {
      text = (session.studentMessage?.voiceTranscript ?? '').trim();
    }

    if (!text && !image) continue;
    turns.push({ role, text: text || ' ', image });
  }

  // Workbook / hint triggers append a synthetic child turn describing the ask.
  if (trigger === 'workbook') {
    const canvas = await fetchImageInline(session.workbookState?.canvasImageURL);
    const qLine = workbookQ ? ` The practice question was: "${workbookQ}".` : '';
    turns.push({
      role: 'user',
      text:
        `I finished my workbook attempt and submitted a photo of my working.${qLine} ` +
        `Please look at my handwriting, tell me kindly if it is correct, and help me with the next step. ` +
        `Also put exactly what I wrote into the "studentAnswer" field, and set isCorrect true only if my answer is right.`,
      image: canvas ?? undefined,
    });
  } else if (trigger === 'hint') {
    const canvas = await fetchImageInline(session.workbookState?.canvasImageURL);
    const qLine = workbookQ ? ` for the practice question "${workbookQ}"` : '';
    turns.push({
      role: 'user',
      text:
        `Can you give me ONE small hint${qLine}? Please do NOT tell me the full answer — ` +
        `just a little nudge so I can try the next step myself. Set isHint true.`,
      image: canvas ?? undefined,
    });
  }

  return turns;
}

// ── Per-request context appended to the system prompt ──────────────────
function buildContext(session: RawSession, trigger: Trigger, workbookQ: string): string {
  const admin = session.adminControl ?? {};
  const lines: string[] = ['CURRENT SESSION CONTEXT:'];
  lines.push(`- Subject: ${session.subject ?? 'not chosen yet'}`);
  if (admin.grade) lines.push(`- Student grade: ${admin.grade}`);
  if (admin.responseMode) lines.push(`- Teacher response mode: ${admin.responseMode}`);
  if (typeof admin.difficulty === 'number') lines.push(`- Teacher difficulty (0=easiest, 5=hardest): ${admin.difficulty}`);
  if (workbookQ) lines.push(`- Active practice question: "${workbookQ}"`);

  if (trigger === 'workbook') {
    lines.push(
      '- TRIGGER: The child submitted a handwritten workbook attempt (image attached). Evaluate their work, ' +
        'confirm warmly if correct (set isCorrect true) or gently guide if wrong (never just hand over the answer), ' +
        'and transcribe what they wrote into "studentAnswer".',
    );
  } else if (trigger === 'hint') {
    lines.push('- TRIGGER: The child asked for a hint. Give ONE small hint only (set isHint true). Do NOT reveal the answer.');
  } else {
    lines.push(
      '- TRIGGER: The child sent a new message. Respond as their scaffolding tutor: this is a normal teaching reply (isHint MUST be false). ' +
        'Explain simply with a small worked example, then give them a practice problem to solve on the canvas board (set attachWorkbook true with a short workbookQuestion) and invite them to write their working on the board.',
    );
  }
  return lines.join('\n');
}

// ── Response JSON schema (Gemini) ──────────────────────────────────────
const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    text: { type: 'STRING', description: 'The tutor reply the child reads. For a normal teaching reply, explain simply WITH a small worked example, then invite the child to try the practice on their tablet canvas board.' },
    readAloudText: { type: 'STRING', description: 'The same message in Urdu script for text-to-speech.' },
    attachWorkbook: { type: 'BOOLEAN', description: 'TRUE when giving the child a problem to solve on their canvas board — set this whenever you have explained something or they are ready to practise. Requires workbookQuestion.' },
    workbookQuestion: { type: 'STRING', description: "The practice problem for the canvas board — normally the child's OWN question restated verbatim (the exact same numbers/problem they asked), NOT a new made-up problem. Required when attachWorkbook is true." },
    isHint: { type: 'BOOLEAN', description: 'TRUE ONLY for a small nudge given without a full explanation (child asked for a hint, is stuck, or got a practice answer wrong). FALSE for every ordinary teaching/explaining reply — most replies are NOT hints.' },
    isCorrect: { type: 'BOOLEAN', description: 'For a workbook submission: true only if the child\'s handwritten answer is correct.' },
    studentAnswer: { type: 'STRING', description: 'For a workbook submission: exactly what the child wrote, transcribed.' },
  },
  required: ['text', 'readAloudText', 'attachWorkbook', 'workbookQuestion', 'isHint', 'isCorrect'],
} as const;

// ── Gemini ─────────────────────────────────────────────────────────────
interface GeminiCallResult {
  out: TutorOutput;
  usedModel: string;
  tokensIn?: number;
  tokensOut?: number;
}

async function callGemini(systemPrompt: string, turns: Turn[], apiKey: string): Promise<GeminiCallResult> {
  const contents = turns.map((t) => {
    const parts: unknown[] = [];
    if (t.image) parts.push({ inline_data: { mime_type: t.image.mimeType, data: t.image.base64 } });
    parts.push({ text: t.text });
    return { role: t.role, parts };
  });

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.6,
      maxOutputTokens: 1024,
    },
  };

  const call = async (model: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    return fetchWithTimeout(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      LLM_TIMEOUT_MS,
    );
  };

  let model = GEMINI_MODEL;
  let res = await call(model);
  // Fall back to the secondary model when the primary is unavailable (404) or its
  // quota is exhausted (429) — the fallback model has a SEPARATE free-tier quota
  // bucket, so read-aloud/hint/submit keep working when gemini-2.5-flash is
  // rate-limited during heavy testing. (Durable fix: enable billing on the key.)
  if (res.status === 404 || res.status === 429) {
    console.warn(`[tutor] gemini model ${model} ${res.status} — falling back to ${GEMINI_FALLBACK_MODEL}`);
    model = GEMINI_FALLBACK_MODEL;
    res = await call(model);
  }
  console.log(`[tutor] provider=gemini model=${model} status=${res.status}`);
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await safeText(res)}`);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return {
    out: parseTutorOutput(text),
    usedModel: model,
    tokensIn: data.usageMetadata?.promptTokenCount,
    tokensOut: data.usageMetadata?.candidatesTokenCount,
  };
}

// ── Parse + coerce the LLM's JSON into a safe TutorOutput ──────────────
function parseTutorOutput(raw: string): TutorOutput {
  let obj: Record<string, unknown> = {};
  const trimmed = (raw ?? '').trim();
  try {
    obj = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // Model wrapped the JSON in prose / fences — extract the first {...} block.
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        obj = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        obj = {};
      }
    }
  }

  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const bool = (v: unknown): boolean => v === true || v === 'true';

  const text = str(obj.text).trim();
  if (!text) throw new Error('LLM returned no usable "text" field');

  const readAloud = str(obj.readAloudText).trim() || text;
  const attachWorkbook = bool(obj.attachWorkbook);
  const workbookQuestion = str(obj.workbookQuestion).trim();
  const studentAnswer = str(obj.studentAnswer).trim();

  return {
    text,
    readAloudText: readAloud,
    attachWorkbook: attachWorkbook && workbookQuestion.length > 0,
    workbookQuestion,
    isHint: bool(obj.isHint),
    isCorrect: bool(obj.isCorrect),
    studentAnswer: studentAnswer || undefined,
  };
}

// ── Write the tutor's reply back into the shared session ───────────────
async function writeReply(roomCode: string, trigger: Trigger, out: TutorOutput): Promise<void> {
  const now = Date.now();

  // Workbook submit: first echo the child's answer as a student bubble so it
  // reads correctly in order, then the tutor reply just after it.
  if (trigger === 'workbook' && out.studentAnswer) {
    await rtdbPost(`sessions/${roomCode}/chatHistory`, {
      role: 'student',
      text: out.studentAnswer,
      type: 'workbook_answer',
      workbookCorrect: out.isCorrect,
      timestamp: now,
    });
  }

  const aiTimestamp = trigger === 'workbook' && out.studentAnswer ? now + 1 : now;

  // Pre-synthesise the Urdu audio and store it BEFORE posting the message, so it
  // is ready the instant the text lands (client reads audioClips/{room}/{ts}).
  const audioReady = await preSynthesizeClip(roomCode, aiTimestamp, out.readAloudText);

  await rtdbPost(`sessions/${roomCode}/chatHistory`, {
    role: 'ai',
    text: out.text,
    readAloudText: out.readAloudText,
    type: 'text',
    workbookQuestion: out.attachWorkbook ? out.workbookQuestion : null,
    isHint: out.isHint,
    isCorrect: out.isCorrect,
    audioReady,
    timestamp: aiTimestamp,
  });

  await rtdbPatch(`sessions/${roomCode}`, {
    status: 'ai_responded',
    showThinking: false,
    aiResponse: {
      text: out.text,
      readAloudText: out.readAloudText,
      attachWorkbook: out.attachWorkbook,
      workbookQuestion: out.attachWorkbook ? out.workbookQuestion : '',
      timestamp: aiTimestamp,
    },
  });

  // Reset workbook flags. On a submit we also clear the canvas for the next
  // try; on a CORRECT solve with no follow-up question we close the workbook so
  // the student app returns to chat, where the "close chat?" prompt renders.
  const wbPatch: Record<string, unknown> =
    trigger === 'workbook'
      ? {
          hintRequested: false,
          submitted: false,
          canvasImageURL: null,
          ...(out.isCorrect && !out.attachWorkbook ? { active: false } : {}),
        }
      : { hintRequested: false };
  await rtdbPatch(`sessions/${roomCode}/workbookState`, wbPatch);
}

// ── Handler ────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Parse body (Vercel usually pre-parses JSON; be defensive anyway).
  let roomCode = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
    roomCode = String((body as { roomCode?: unknown }).roomCode ?? '').trim();
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(roomCode)) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid roomCode' });
  }

  if (!dbBase()) {
    return res.status(500).json({ ok: false, error: 'FIREBASE_DATABASE_URL not configured' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const session = (await rtdbGet(`sessions/${roomCode}`)) as RawSession | null;
    if (!session) {
      return res.status(404).json({ ok: false, error: `Session ${roomCode} not found` });
    }

    const trigger = detectTrigger(session);
    if (!trigger) {
      console.log(`[tutor] room=${roomCode} no actionable trigger (status=${session.status ?? 'none'})`);
      return res.status(200).json({ ok: true, skipped: 'no actionable trigger' });
    }

    const msgs = Object.values(session.chatHistory ?? {})
      .filter((m): m is RawChatMessage => Boolean(m))
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    const workbookQ = activeWorkbookQuestion(msgs, session);
    const turns = await buildTurns(msgs, session, trigger, workbookQ);
    // Chats usually open with an AI greeting; some Gemini endpoints reject a
    // leading model turn, so drop them. The trailing turn is always `user`.
    while (turns.length && turns[0].role === 'model') turns.shift();
    if (turns.length === 0) {
      return res.status(200).json({ ok: true, skipped: 'no conversation to respond to' });
    }

    // Base tutor rules + the current subject's teaching guide + live context.
    const systemPrompt = [TUTOR_SYSTEM_PROMPT, subjectGuide(session.subject), buildContext(session, trigger, workbookQ)]
      .filter(Boolean)
      .join('\n\n');

    console.log(`[tutor] room=${roomCode} trigger=${trigger} provider=gemini turns=${turns.length}`);
    const llmStarted = Date.now();
    let result: GeminiCallResult;
    try {
      result = await callGemini(systemPrompt, turns, geminiKey);
    } catch (err) {
      await logUsage({ ts: llmStarted, api: 'tutor', model: GEMINI_MODEL, ok: false, ms: Date.now() - llmStarted, roomCode });
      throw err;
    }
    const out = result.out;
    await logUsage({
      ts: llmStarted,
      api: 'tutor',
      model: result.usedModel,
      ok: true,
      ms: Date.now() - llmStarted,
      ...(result.tokensIn != null ? { tokensIn: result.tokensIn } : {}),
      ...(result.tokensOut != null ? { tokensOut: result.tokensOut } : {}),
      roomCode,
    });

    // Force flag consistency with the trigger so bubble colours are correct.
    // Chat triggers keep the model's isCorrect: the system prompt sets it when
    // the child solves their question in chat, and the student app's "close
    // chat?" prompt keys off it. Only hints can never be "correct".
    if (trigger === 'hint') { out.isHint = true; out.isCorrect = false; }

    await writeReply(roomCode, trigger, out);

    return res.status(200).json({ ok: true, trigger, provider: 'gemini' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[tutor] room=${roomCode} provider=gemini FAILED: ${msg}`);
    // Stop the student's spinner even on failure so the UI doesn't hang forever.
    try {
      await rtdbPatch(`sessions/${roomCode}`, { showThinking: false });
    } catch {
      /* best effort */
    }
    return res.status(502).json({ ok: false, error: `Tutor generation failed: ${msg}` });
  }
}
