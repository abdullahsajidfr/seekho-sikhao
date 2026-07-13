import type { VercelRequest, VercelResponse } from '@vercel/node';
import { synthesizeSpeech } from './_tts.js';

/** On-demand TTS: GET ?text=… → Urdu `audio/mpeg`. The tutor now PRE-synthesises
 *  most replies (see api/tutor.ts) so this is mainly a fallback / manual-replay
 *  path and the source of truth for the shared synthesis lives in `_tts.ts`. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const text = String(req.query.text ?? '').slice(0, 1000);
  if (!text) return res.status(400).send('Missing text');

  const apiKey = process.env.UPLIFT_API_KEY;
  if (!apiKey) return res.status(500).send('TTS not configured');

  try {
    const buffer = await synthesizeSpeech(text, apiKey);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (e) {
    res.status(502).send(`TTS error: ${e}`);
  }
}
