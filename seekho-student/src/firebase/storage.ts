import { firebaseEnabled } from './config';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * React Native adaptation of the web storage layer. On device we receive local
 * file URIs (from expo-camera / expo-image-picker / expo-audio) or data URIs
 * (from the drawing canvas view-shot) rather than DOM File/Blob objects.
 * Without Firebase credentials every helper returns the local URI unchanged so
 * the UI still shows the image in the chat while running in demo mode.
 *
 * Binary storage backend: the Firebase project is on the free Spark plan,
 * where Cloud Storage buckets can no longer be provisioned, so photos and
 * voice clips are stored INSIDE the Realtime Database as base64 data URIs —
 * the same pattern the workbook canvas already uses, and one the tutor API
 * (`fetchImageInline`) and all chat renderers already accept. Photos are
 * resized/compressed first to keep messages small (~150-250 KB); voice WAVs
 * are 16 kHz mono so a typical question is a few hundred KB.
 *
 * If `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set, the
 * helpers instead upload to a public Supabase Storage bucket and return its
 * download URL — flip these on later to move blobs out of the database with no
 * code change.
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = 'seekho-media';
const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Longest edge of a homework photo stored in the database. */
const PHOTO_MAX_WIDTH = 1280;
const PHOTO_COMPRESS = 0.5;

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
    return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
  } finally {
    // RN Blobs allocated by the BlobModule must be released to free memory.
    (blob as unknown as { close?: () => void }).close?.();
  }
}

/** Resize + recompress a photo and return it as a `data:image/jpeg` URI. */
async function photoToDataUri(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: PHOTO_MAX_WIDTH });
  const image = await context.renderAsync();
  try {
    const result = await image.saveAsync({ compress: PHOTO_COMPRESS, format: SaveFormat.JPEG, base64: true });
    if (!result.base64) throw new Error('photoToDataUri: no base64 in result');
    return `data:image/jpeg;base64,${result.base64}`;
  } finally {
    image.release();
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
    if (supabaseEnabled) return await uploadToSupabase(`sessions/${roomCode}/photos/${Date.now()}.jpg`, uri);
    return await photoToDataUri(uri);
  } catch (err) {
    console.log('[storage] uploadPhoto failed', err);
    throw err;
  }
}

/**
 * Persist a recorded voice clip (WAV) and return its stored form — a Supabase
 * download URL, or a `data:audio/wav` URI destined for RTDB. `timestamp` is
 * passed so a Supabase file lines up with the chat message it belongs to.
 * Callers MUST treat this as best-effort and never block the chat flow on it
 * (see `sendStudentMessage`).
 */
export async function uploadVoice(roomCode: string, uri: string, timestamp?: number): Promise<string> {
  if (!firebaseEnabled) return uri;
  try {
    if (supabaseEnabled) {
      return await uploadToSupabase(`sessions/${roomCode}/voice/${timestamp ?? Date.now()}.wav`, uri);
    }
    const base64 = await new File(uri).base64();
    if (!base64) throw new Error('uploadVoice: empty base64');
    return `data:audio/wav;base64,${base64}`;
  } catch (err) {
    console.log('[storage] uploadVoice failed', err);
    throw err;
  }
}
