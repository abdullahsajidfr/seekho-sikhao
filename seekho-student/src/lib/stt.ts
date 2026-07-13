/**
 * Speech-to-text for voice questions. Reads the recorded WAV clip, sends it to
 * the WoZ `api/stt.ts` endpoint (Gemini transcription), and returns the child's
 * words so they can be shown in the input box for review/edit before sending.
 *
 * Set `EXPO_PUBLIC_STT_ENDPOINT` to the deployed `/api/stt` URL to enable it.
 * Returns '' when the endpoint is unset or the request fails (the caller then
 * lets the child type instead of blocking on a failed transcription).
 */
import { File } from 'expo-file-system';

export async function transcribeAudio(fileUri: string, mimeType = 'audio/wav'): Promise<string> {
  const endpoint = process.env.EXPO_PUBLIC_STT_ENDPOINT;
  if (!endpoint || !fileUri) return '';

  try {
    const audioBase64 = await new File(fileUri).base64();
    if (!audioBase64) return '';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType }),
    });
    if (!res.ok) return '';

    const data = (await res.json()) as { ok?: boolean; transcript?: string };
    return (data.transcript ?? '').trim();
  } catch (e) {
    console.log('[stt] transcribeAudio failed', e);
    return '';
  }
}
