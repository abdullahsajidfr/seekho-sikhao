// Shared API-usage logger. Every serverless handler records one raw row per
// upstream call to RTDB `telemetry/usage/{YYYY-MM-DD}` (auto-ID), which the
// researcher-facing `/usage` page subscribes to live. Raw rows (not counters):
// research-scale volume is tiny, rows stay auditable, and the page only ever
// reads a single day's node.

export interface UsageRecord {
  ts: number;
  api: 'tutor' | 'stt' | 'tts';
  /** Upstream model that actually served: 'gemini-2.5-flash', 'scribe', 'uplift-tts', … */
  model: string;
  ok: boolean;
  ms: number;
  tokensIn?: number;
  tokensOut?: number;
  /** TTS input length. */
  chars?: number;
  /** STT clip length (Uplift scribe bills 40 credits/min). */
  audioSecs?: number;
  roomCode?: string;
}

const USAGE_TIMEOUT_MS = 3_000;

/**
 * Best-effort: never throws. Callers should `await` it just before sending the
 * response (Vercel may freeze the process once the response ends).
 */
export async function logUsage(rec: UsageRecord): Promise<void> {
  try {
    const base = (process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || '').replace(/\/+$/, '');
    if (!base) return;
    // Day key in Pakistan time (UTC+5) so records land on the same date the
    // researcher's /usage page (browsing from Pakistan) shows — a UTC key
    // would file evening calls under "yesterday".
    const day = new Date(rec.ts + 5 * 3600_000).toISOString().slice(0, 10);
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), USAGE_TIMEOUT_MS);
    try {
      await fetch(`${base}/telemetry/usage/${day}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rec),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(t);
    }
  } catch (e) {
    console.error(`[usage] log failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
