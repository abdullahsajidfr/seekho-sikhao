import type { VercelRequest, VercelResponse } from '@vercel/node';

const URDU_SCRIPT_RE = /[؀-ۿ]/;
const ROMAN_URDU_RE = /\b(aaj|kal|abhi|ab|phir|lekin|magar|kyun|kyu|kaise|kaisa|kaisi|kaun|kahan|kab|kya|mein|main|mujhe|mujhko|hum|humein|hume|tum|tumhe|tumhein|aap|aapko|yeh|ye|woh|wo|inka|unka|isse|usse|hai|hain|tha|thi|thay|hoga|hogi|hongay|nahi|nai|nahin|karna|karo|kiya|kiye|jana|gaya|gayi|gaye|aana|aya|ayi|bolna|suno|dekho|samajhna|parhna|likhna|seekhna|sikhna|chahiye|chahta|chahti|chahte|acha|accha|theek|thik|sahi|galat|bohat|bahut|bohot|zyada|ziyada|thora|thoda|toh|sirf|yahan|wahan|idhar|udhar|mera|meri|mere|tera|teri|tere|hamara|tumhara|apna|assalam|assalamu|alaikum|walaikum|shukriya|bhai|behen|dost|dosto|beta|beti|yaar|jaldi|pehle|subah|shaam|pata|maloom|zaroor|shayad|bilkul)\b/i;

async function toUrduScript(text: string): Promise<string> {
  // Transliterate Roman Urdu → Urdu script via Google Input Tools. (A translate
  // ur→ur call is a no-op — it echoes the Roman text back unchanged.) The API
  // returns ["SUCCESS", [[srcChunk, [candidate, ...]], ...]]; candidates already
  // carry their own leading whitespace, so segments join with '' not ' '.
  const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ur-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return text;
  const data = await res.json();
  if (!Array.isArray(data) || data[0] !== 'SUCCESS' || !Array.isArray(data[1])) return text;
  const segments = data[1] as [string, string[]][];
  const out = segments.map(seg => seg[1]?.[0] ?? seg[0]).join('');
  return out || text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const text = String(req.query.text ?? '').slice(0, 1000);
  if (!text) return res.status(400).send('Missing text');

  const apiKey = process.env.UPLIFT_API_KEY;
  if (!apiKey) return res.status(500).send('TTS not configured');

  try {
    // Transliterate only if it's Roman Urdu (no script yet). Pure English passes through as-is.
    const needsTranslit = !URDU_SCRIPT_RE.test(text) && ROMAN_URDU_RE.test(text);
    const ttsText = needsTranslit ? await toUrduScript(text) : text;

    const response = await fetch('https://api.upliftai.org/v1/synthesis/text-to-speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId: 'v_8eelc901', text: ttsText, outputFormat: 'MP3_22050_128' }),
    });

    if (!response.ok) throw new Error(await response.text());

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (e) {
    res.status(502).send(`TTS error: ${e}`);
  }
}
