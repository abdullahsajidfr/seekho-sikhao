import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Speech-to-text for the child's voice question. The app records a short WAV
 * clip, POSTs it here as base64, and we ask Gemini to transcribe it verbatim in
 * the child's own Urdu/English code-switching. Returns { transcript }.
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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

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

  // gemini-2.5 models think by default and thought tokens count against
  // maxOutputTokens, so an unbounded thinking burst can exhaust the budget and
  // return zero text parts. Transcription needs no reasoning — disable it on
  // models that support the knob (2.0-flash rejects thinkingConfig).
  const buildBody = (model: string) => ({
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: mimeType, data: audioBase64 } },
          { text: TRANSCRIBE_PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 256,
      ...(model.startsWith('gemini-2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  });

  const call = (model: string) =>
    fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildBody(model)) },
      TIMEOUT_MS,
    );

  try {
    let response = await call(GEMINI_MODEL);
    // Fall back to the secondary model when the primary is unavailable (404) or
    // rate-limited (429) — the fallback has a separate free-tier quota bucket, so
    // voice input keeps working when gemini-2.5-flash is throttled during heavy
    // testing (mirrors the fallback in api/tutor.ts).
    if (response.status === 404 || response.status === 429) response = await call(GEMINI_FALLBACK_MODEL);
    if (!response.ok) throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };
    if (data.promptFeedback?.blockReason) throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);

    const transcript = (data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '').trim();
    // An empty transcript is a legitimate "no clear speech" answer only when the
    // model finished normally; a truncated response must surface as an error
    // rather than silently swallowing the child's recording.
    const finishReason = data.candidates?.[0]?.finishReason;
    if (!transcript && finishReason && finishReason !== 'STOP') {
      throw new Error(`Gemini returned no transcript (finishReason: ${finishReason})`);
    }
    return res.status(200).json({ ok: true, transcript });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[stt] FAILED: ${msg}`);
    return res.status(502).json({ ok: false, error: `Transcription failed: ${msg}` });
  }
}
