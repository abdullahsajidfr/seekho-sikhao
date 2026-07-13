import { db, firebaseEnabled } from './config';
import { ref, set } from 'firebase/database';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { logEvent } from './admin';

/**
 * React Native adaptation of the web storage layer. On device we receive local
 * file URIs (from expo-camera / expo-image-picker / expo-audio) or data URIs
 * (from the drawing canvas view-shot) rather than DOM File/Blob objects.
 * Without Firebase credentials every helper returns the local URI unchanged so
 * the UI still shows the image in the chat while running in demo mode.
 *
 * Binary storage backend: the Firebase project is on the free Spark plan,
 * where Cloud Storage buckets can no longer be provisioned, so blobs live in
 * the Realtime Database as base64 data URIs. Photos are resized/compressed to
 * ~150-250 KB and stored inline on the chat message (the tutor API's
 * `fetchImageInline` and all chat renderers accept data URIs). Voice clips are
 * larger (16 kHz mono WAV, up to ~2.6 MB base64 at the 60 s recording cap), so
 * they are written OUTSIDE the session node — at top-level
 * `voiceClips/{room}/{timestamp}/{i}` — keeping them out of the whole-session
 * subscription, the tutor's per-message session fetch, and pastChats archives;
 * the chat message's `audioURL` field stores only that RTDB path string.
 *
 * If `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set, the
 * helpers instead upload to a public Supabase Storage bucket and `audioURL` /
 * `photoURL` hold real download URLs — flip these on later to move blobs out
 * of the database with no code change (photos are normalized identically on
 * both backends).
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = 'seekho-media';
const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Longest edge of a homework photo after normalization (downscale only). */
const PHOTO_MAX_EDGE = 1280;
const PHOTO_COMPRESS = 0.5;

/**
 * Voice clips above this many base64 chars (≈2 MB of WAV) are dropped rather
 * than written to RTDB — logged as `voice:clip-too-large` so the gap is
 * visible in the research data.
 */
const VOICE_MAX_BASE64_CHARS = 2_700_000;

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  wav: 'audio/wav',
};

/**
 * Read a local `file://` (or `data:`) URI into a real Blob.
 *
 * IMPORTANT: on React Native/iOS, `fetch(fileUri).then(r => r.blob())` — the
 * pattern that works on the web — frequently yields an empty or broken blob, so
 * a plain fetch body silently uploads nothing. The reliable RN pattern is an
 * `XMLHttpRequest` with `responseType = 'blob'`, which goes through RN's native
 * BlobModule and produces a valid, uploadable Blob.
 */
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = () => {
      if (xhr.response) resolve(xhr.response as Blob);
      else reject(new Error(`uriToBlob: empty blob for ${uri.slice(0, 40)}`));
    };
    xhr.onerror = () => reject(new Error(`uriToBlob: request failed for ${uri.slice(0, 40)}`));
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function uploadToSupabase(path: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  try {
    const ext = path.split('.').pop() ?? '';
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY!,
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      },
      body: blob,
    });
    if (!res.ok) throw new Error(`supabase upload failed: ${res.status} ${await res.text()}`);
    return supabasePublicUrl(path);
  } finally {
    // RN Blobs allocated by the BlobModule must be released to free memory.
    (blob as unknown as { close?: () => void }).close?.();
  }
}

function supabasePublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
}

const supabaseVoicePath = (roomCode: string, timestamp: number, i: number) =>
  `sessions/${roomCode}/voice/${timestamp}-${i}.wav`;

/**
 * Resize + recompress a photo and return it as a `data:image/jpeg` URI.
 * Downscale only: images already within PHOTO_MAX_EDGE keep their dimensions
 * (upscaling a small gallery pick would grow the payload and degrade quality);
 * larger ones are scaled so their LONGEST edge is PHOTO_MAX_EDGE.
 */
async function photoToDataUri(uri: string): Promise<string> {
  const source = await ImageManipulator.manipulate(uri).renderAsync();
  let scaled: typeof source | null = null;
  try {
    let final = source;
    if (Math.max(source.width, source.height) > PHOTO_MAX_EDGE) {
      const context = ImageManipulator.manipulate(source);
      context.resize(source.width >= source.height ? { width: PHOTO_MAX_EDGE } : { height: PHOTO_MAX_EDGE });
      scaled = await context.renderAsync();
      final = scaled;
    }
    const result = await final.saveAsync({ compress: PHOTO_COMPRESS, format: SaveFormat.JPEG, base64: true });
    if (!result.base64) throw new Error('photoToDataUri: no base64 in result');
    return `data:image/jpeg;base64,${result.base64}`;
  } finally {
    scaled?.release();
    source.release();
  }
}

export async function uploadCanvasImage(roomCode: string, dataUrl: string): Promise<string> {
  if (!firebaseEnabled) return dataUrl;
  if (!supabaseEnabled) return dataUrl; // already a compact data URI — store as-is
  try {
    return await uploadToSupabase(`sessions/${roomCode}/canvas/${Date.now()}.png`, dataUrl);
  } catch (err) {
    console.log('[storage] uploadCanvasImage failed', err);
    throw err;
  }
}

export async function uploadPhoto(roomCode: string, uri: string): Promise<string> {
  if (!firebaseEnabled) return uri;
  try {
    // Normalize (downscale + recompress) BEFORE the backend split so both
    // storage backends persist the same ~150-250 KB JPEG.
    const dataUri = await photoToDataUri(uri);
    if (supabaseEnabled) return await uploadToSupabase(`sessions/${roomCode}/photos/${Date.now()}.jpg`, dataUri);
    return dataUri;
  } catch (err) {
    console.log('[storage] uploadPhoto failed', err);
    throw err;
  }
}

/**
 * The value stored on a voice message's `audioURL` field, computable
 * SYNCHRONOUSLY at send time so it rides the initial message push (no
 * back-patch, so archiving/clearing the chat can never race a late update into
 * re-creating a deleted message). RTDB backend: the top-level path holding the
 * clip data URIs (children 0..n-1). Supabase backend: the public URL of the
 * first clip (additional clips live at the same prefix with -1, -2, …).
 */
export function voiceClipRef(roomCode: string, timestamp: number): string {
  if (supabaseEnabled) return supabasePublicUrl(supabaseVoicePath(roomCode, timestamp, 0));
  return `voiceClips/${roomCode}/${timestamp}`;
}

/**
 * Persist the recorded clips behind an already-sent voice message (see
 * `voiceClipRef`). Best-effort: callers must never block the chat flow on it.
 * Oversized clips are skipped with a `voice:clip-too-large` event; other
 * failures reject so the caller can log `voice:upload-failed`.
 */
export async function persistVoiceClips(roomCode: string, uris: string[], timestamp: number): Promise<void> {
  if (!firebaseEnabled) return;
  for (let i = 0; i < uris.length; i++) {
    if (supabaseEnabled) {
      await uploadToSupabase(supabaseVoicePath(roomCode, timestamp, i), uris[i]);
      continue;
    }
    const base64 = await new File(uris[i]).base64();
    if (!base64) throw new Error('persistVoiceClips: empty base64');
    if (base64.length > VOICE_MAX_BASE64_CHARS) {
      logEvent(roomCode, 'voice:clip-too-large', 'student_app', {});
      continue;
    }
    await set(ref(db, `voiceClips/${roomCode}/${timestamp}/${i}`), `data:audio/wav;base64,${base64}`);
  }
}
