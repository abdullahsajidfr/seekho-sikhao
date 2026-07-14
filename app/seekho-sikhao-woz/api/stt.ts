import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withUpliftKey, upliftKeys } from './_uplift.js';
import { logUsage } from './_usage.js';

/**
 * Speech-to-text for the child's voice question. The app records a short WAV
 * clip and POSTs it here as base64. Primary path: UpliftAI's Pakistani-language
 * `scribe` model (far better on children's Urdu/English code-switching than a
 * generic model) → Urdu-script transcript → a cheap Gemini TEXT call converts
 * it to Roman Urdu the way children type. Fallback on any Uplift failure: the
 * original single-shot Gemini audio transcription. Returns { transcript }.
 *
 * The transcript is shown back in the input box for the child to review/edit
 * before sending, so accuracy matters more than latency here.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = 'gemini-2.0-flash';
const TIMEOUT_MS = 30_000;

const TRANSCRIBE_PROMPT =
  'Transcribe this short voice clip of a child (about 8–12 years old) in Pakistan asking a school/homework question. ' +
  'They speak a natural mix of Urdu and English. Write Urdu words in Roman Urdu (Latin letters, the way children type) and keep English words in English. ' +
  'Output ONLY the exact words spoken — no quotes, no translation, no commentary. If there is no clear speech, output an empty string.';

const ROMANIZE_PROMPT =
  'Convert this transcript of a Pakistani child speaking (Urdu script, possibly mixed with English words) into Roman Urdu ' +
  'exactly the way children type it: Urdu words in Latin letters, English words unchanged, numbers as digits. ' +
  'Output ONLY the converted text — no quotes, no commentary.\n\nTranscript:\n';

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── Gemini helpers ──────────────────────────────────────────────────────

function geminiBody(model: string, parts: unknown[]) {
  return {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 256,
      // gemini-2.5 models think by default and thought tokens count against
      // maxOutputTokens; transcription/romanization needs no reasoning.
      // (2.0-flash rejects thinkingConfig, so only send it to 2.5 models.)
      ...(model.startsWith('gemini-2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  };
}

/** Call Gemini with the primary model, falling back to the secondary on 404
 *  (model unavailable) or 429 (separate free-tier quota bucket). Returns the
 *  response text and which model served. */
async function callGeminiText(apiKey: string, parts: unknown[]): Promise<{ text: string; model: string }> {
  const call = (model: string) =>
    fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody(model, parts)) },
      TIMEOUT_MS,
    );

  let model = GEMINI_MODEL;
  let response = await call(model);
  if (response.status >= 500) response = await call(model); // one retry on transient 5xx
  if (response.status === 404 || response.status === 429 || response.status >= 500) {
    model = GEMINI_FALLBACK_MODEL;
    response = await call(model);
  }
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);

  const text = (data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '').trim();
  // An empty result is a legitimate "no clear speech" answer only when the
  // model finished normally; a truncated response must surface as an error
  // rather than silently swallowing the child's recording.
  const finishReason = data.candidates?.[0]?.finishReason;
  if (!text && finishReason && finishReason !== 'STOP') {
    throw new Error(`Gemini returned no text (finishReason: ${finishReason})`);
  }
  return { text, model };
}

// ── UpliftAI scribe ─────────────────────────────────────────────────────

async function upliftTranscribe(audioBase64: string, mimeType: string): Promise<string> {
  const form = new FormData();
  // Do NOT set Content-Type manually — fetch adds the multipart boundary.
  form.append('file', new Blob([Buffer.from(audioBase64, 'base64')], { type: mimeType }), 'audio.wav');
  form.append('model', 'scribe');
  form.append('language', 'ur');
  const response = await withUpliftKey((apiKey) =>
    fetchWithTimeout(
      'https://api.upliftai.org/v1/transcribe/speech-to-text',
      { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form },
      TIMEOUT_MS,
    ),
  );
  if (!response.ok) throw new Error(`Uplift STT ${response.status}: ${(await response.text()).slice(0, 300)}`);
  // Live API returns { transcript }; docs say { text } — accept both.
  const data = (await response.json()) as { transcript?: string; text?: string };
  return (data.transcript ?? data.text ?? '').trim();
}

// ── Handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY not configured' });

  let audioBase64 = '';
  let mimeType = 'audio/wav';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
    audioBase64 = String((body as { audioBase64?: unknown }).audioBase64 ?? '');
    mimeType = String((body as { mimeType?: unknown }).mimeType ?? 'audio/wav');
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }
  if (!audioBase64) return res.status(400).json({ ok: false, error: 'Missing audioBase64' });

  // Clip length for scribe credit accounting: 16 kHz / 16-bit / mono WAV.
  const audioSecs = Math.round((audioBase64.length * 0.75) / 32_000);
  const started = Date.now();

  // Primary: Uplift scribe → Gemini romanization.
  if (upliftKeys().length > 0) {
    try {
      const urduScript = await upliftTranscribe(audioBase64, mimeType);
      if (!urduScript) {
        // Scribe heard no clear speech — a legitimate empty transcript.
        console.log('[stt] path=uplift transcript=empty');
        await logUsage({ ts: started, api: 'stt', model: 'scribe', ok: true, ms: Date.now() - started, audioSecs });
        return res.status(200).json({ ok: true, transcript: '' });
      }
      const { text: transcript, model } = await callGeminiText(apiKey, [{ text: ROMANIZE_PROMPT + urduScript }]);
      console.log(`[stt] path=uplift romanizer=${model}`);
      await logUsage({ ts: started, api: 'stt', model: 'scribe', ok: true, ms: Date.now() - started, audioSecs });
      return res.status(200).json({ ok: true, transcript: transcript || urduScript });
    } catch (e) {
      console.error(`[stt] uplift path failed, falling back to gemini: ${e instanceof Error ? e.message : String(e)}`);
      await logUsage({ ts: started, api: 'stt', model: 'scribe', ok: false, ms: Date.now() - started, audioSecs });
    }
  }

  // Fallback: single-shot Gemini audio transcription (the original path).
  const fbStarted = Date.now();
  try {
    const { text: transcript, model } = await callGeminiText(apiKey, [
      { inline_data: { mime_type: mimeType, data: audioBase64 } },
      { text: TRANSCRIBE_PROMPT },
    ]);
    console.log(`[stt] path=gemini model=${model}`);
    await logUsage({ ts: fbStarted, api: 'stt', model, ok: true, ms: Date.now() - fbStarted, audioSecs });
    return res.status(200).json({ ok: true, transcript });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[stt] FAILED: ${msg}`);
    await logUsage({ ts: fbStarted, api: 'stt', model: GEMINI_MODEL, ok: false, ms: Date.now() - fbStarted, audioSecs });
    return res.status(502).json({ ok: false, error: `Transcription failed: ${msg}` });
  }
}
