import type { VercelRequest, VercelResponse } from '@vercel/node';

const URDU_SCRIPT_RE = /[؀-ۿ]/;
const ROMAN_URDU_RE = /\b(aaj|kal|abhi|ab|phir|lekin|magar|kyun|kyu|kaise|kaisa|kaisi|kaun|kahan|kab|kya|mein|main|mujhe|mujhko|hum|humein|hume|tum|tumhe|tumhein|aap|aapko|yeh|ye|woh|wo|inka|unka|isse|usse|hai|hain|tha|thi|thay|hoga|hogi|hongay|nahi|nai|nahin|karna|karo|kiya|kiye|jana|gaya|gayi|gaye|aana|aya|ayi|bolna|suno|dekho|samajhna|parhna|likhna|seekhna|sikhna|chahiye|chahta|chahti|chahte|acha|accha|theek|thik|sahi|galat|bohat|bahut|bohot|zyada|ziyada|thora|thoda|toh|sirf|yahan|wahan|idhar|udhar|mera|meri|mere|tera|teri|tere|hamara|tumhara|apna|assalam|assalamu|alaikum|walaikum|shukriya|bhai|behen|dost|dosto|beta|beti|yaar|jaldi|pehle|subah|shaam|pata|maloom|zaroor|shayad|bilkul)\b/i;

async function toUrduScript(text: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ur&tl=ur&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return text;
  const data = await res.json();
  return (data[0] as [string, string][]).map(seg => seg[0]).join('');
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
