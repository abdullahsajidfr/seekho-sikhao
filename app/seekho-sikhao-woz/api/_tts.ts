// Shared UpliftAI speech synthesis used by both the on-demand `api/tts.ts`
// endpoint and the tutor's server-side PRE-synthesis (`api/tutor.ts`). Files
// under `api/` starting with `_` are not treated as endpoints by Vercel.

const URDU_SCRIPT_RE = /[؀-ۿ]/;
const ROMAN_URDU_RE = /\b(aaj|kal|abhi|ab|phir|lekin|magar|kyun|kyu|kaise|kaisa|kaisi|kaun|kahan|kab|kya|mein|main|mujhe|mujhko|hum|humein|hume|tum|tumhe|tumhein|aap|aapko|yeh|ye|woh|wo|inka|unka|isse|usse|hai|hain|tha|thi|thay|hoga|hogi|hongay|nahi|nai|nahin|karna|karo|kiya|kiye|jana|gaya|gayi|gaye|aana|aya|ayi|bolna|suno|dekho|samajhna|parhna|likhna|seekhna|sikhna|chahiye|chahta|chahti|chahte|acha|accha|theek|thik|sahi|galat|bohat|bahut|bohot|zyada|ziyada|thora|thoda|toh|sirf|yahan|wahan|idhar|udhar|mera|meri|mere|tera|teri|tere|hamara|tumhara|apna|assalam|assalamu|alaikum|walaikum|shukriya|bhai|behen|dost|dosto|beta|beti|yaar|jaldi|pehle|subah|shaam|pata|maloom|zaroor|shayad|bilkul)\b/i;

const UPLIFT_VOICE_ID = 'v_8eelc901';
const UPLIFT_FORMAT = 'MP3_22050_128';

/**
 * Transliterate Roman Urdu → Urdu script via Google Input Tools. (A translate
 * ur→ur call is a no-op — it echoes the Roman text back unchanged.) The API
 * returns ["SUCCESS", [[srcChunk, [candidate, ...]], ...]]; candidates already
 * carry their own leading whitespace, so segments join with '' not ' '.
 */
async function toUrduScript(text: string): Promise<string> {
  const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ur-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return text;
  const data = await res.json();
  if (!Array.isArray(data) || data[0] !== 'SUCCESS' || !Array.isArray(data[1])) return text;
  const segments = data[1] as [string, string[]][];
  const out = segments.map((seg) => seg[1]?.[0] ?? seg[0]).join('');
  return out || text;
}

/** Best text to feed the voice model: transliterate only Roman Urdu, leave Urdu
 *  script and plain English as-is. */
export async function toSpeakableText(text: string): Promise<string> {
  const needsTranslit = !URDU_SCRIPT_RE.test(text) && ROMAN_URDU_RE.test(text);
  return needsTranslit ? await toUrduScript(text) : text;
}

/** Synthesise `text` to an MP3 buffer with the UpliftAI Urdu voice. Throws on
 *  failure so callers can fall back / log. */
export async function synthesizeSpeech(text: string, apiKey: string): Promise<Buffer> {
  const ttsText = await toSpeakableText(text.slice(0, 1000));
  const response = await fetch('https://api.upliftai.org/v1/synthesis/text-to-speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ voiceId: UPLIFT_VOICE_ID, text: ttsText, outputFormat: UPLIFT_FORMAT }),
  });
  if (!response.ok) throw new Error(`UpliftAI ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return Buffer.from(await response.arrayBuffer());
}
