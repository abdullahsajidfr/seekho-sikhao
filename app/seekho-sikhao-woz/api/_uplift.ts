// Shared UpliftAI key management. `UPLIFT_API_KEY` is the primary;
// `UPLIFT_API_KEYS_FALLBACK` is a comma-separated list of backup keys tried in
// order when a key is rejected (401) or out of credits/rate-limited (402/429),
// so voice features survive a single account's quota running dry mid-session.

export function upliftKeys(): string[] {
  const keys = [process.env.UPLIFT_API_KEY, ...(process.env.UPLIFT_API_KEYS_FALLBACK ?? '').split(',')]
    .map((k) => (k ?? '').trim())
    .filter(Boolean);
  return [...new Set(keys)];
}

const ROTATE_STATUSES = new Set([401, 402, 429]);

/**
 * Run `request` with each configured key until one is accepted. Returns the
 * first response that is not a key/quota rejection (including non-OK responses
 * of other kinds — those are the caller's to handle). Throws if no keys are
 * configured.
 */
export async function withUpliftKey(request: (apiKey: string) => Promise<Response>): Promise<Response> {
  const keys = upliftKeys();
  if (keys.length === 0) throw new Error('No UpliftAI API keys configured');
  let last: Response | null = null;
  for (const key of keys) {
    const res = await request(key);
    if (!ROTATE_STATUSES.has(res.status)) return res;
    console.warn(`[uplift] key …${key.slice(-6)} rejected (${res.status}) — trying next key`);
    last = res;
  }
  return last!;
}
