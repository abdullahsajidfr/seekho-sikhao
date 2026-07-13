/**
 * UpliftAI read-aloud playback (Item 6).
 *
 * The WoZ backend exposes `api/tts.ts` (UpliftAI voice `v_8eelc901`) which
 * transliterates Roman Urdu → Urdu script and returns an Urdu `audio/mpeg`.
 *
 * Latency: we download the clip to a local cache file with a SINGLE request
 * (`File.downloadFileAsync`) and play THAT file — previously we fetched the URL
 * once to validate it and the native player fetched it a second time, so the
 * server synthesised the same audio twice, roughly doubling the wait before the
 * voice started. Clips are also memoised by exact text, so replaying a message
 * (the per-bubble ▶ button) is instant with no re-synthesis.
 *
 * `speakViaUplift` returns `true` on success so the caller can fall back to the
 * native `expo-speech` path when the endpoint is unset or the request fails.
 *
 * Set `EXPO_PUBLIC_TTS_ENDPOINT` to the deployed `/api/tts` URL to enable it.
 * The backend also needs `UPLIFT_API_KEY` set to actually synthesise audio.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { ref, get } from 'firebase/database';
import { db, firebaseEnabled } from '../firebase/config';

let currentPlayer: AudioPlayer | null = null;
let audioModeReady = false;
// Session-unique prefix: `fileCounter` restarts at 0 on every JS reload while
// old tts-*.mp3 files persist in the cache dir, and SDK 54's downloadFileAsync
// throws "Destination already exists" on a name collision.
const SESSION_PREFIX = Date.now().toString(36);
let fileCounter = 0;

const nextClipFile = () => new File(Paths.cache, `tts-${SESSION_PREFIX}-${fileCounter++}.mp3`);

/**
 * Playback lifecycle hooks the read-aloud hook threads down so the chat bubbles
 * can mirror the voice: `onStart` fires once audio actually begins, `onProgress`
 * reports 0→1 (`currentTime / duration`) for the karaoke word reveal, and
 * `onEnd` fires when the clip finishes on its own. `shouldStart` is checked at
 * the last moment before playback so a superseded request (e.g. the user tapped
 * a different message while this one was still synthesising) never starts.
 */
export interface PlaybackCallbacks {
  shouldStart?: () => boolean;
  onStart?: () => void;
  onProgress?: (progress: number) => void;
  onEnd?: () => void;
}

// Memoise clips by key (text, or `stored:{room}:{ts}`) → local file uri so
// replays are instant. Bounded; the oldest clip's file is deleted past the cap.
const clipCache = new Map<string, string>();
const CACHE_MAX = 24;

/** Remember a clip file under `key`, evicting + deleting the oldest past the cap. */
function rememberClip(key: string, uri: string): void {
  clipCache.set(key, uri);
  if (clipCache.size > CACHE_MAX) {
    const oldestKey = clipCache.keys().next().value;
    if (oldestKey !== undefined) {
      const oldUri = clipCache.get(oldestKey);
      clipCache.delete(oldestKey);
      try { if (oldUri) new File(oldUri).delete(); } catch { /* best effort */ }
    }
  }
}

/** Decode base64 to bytes in JS: Expo Go 54's native File.write accepts only a
 *  single argument (the TS types are newer than the native module), so the
 *  `{ encoding: 'base64' }` option crashes at runtime with an args-count error. */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Write base64 audio to a fresh cache file and return its uri. */
function writeBase64ToCache(base64: string): string {
  const dest = nextClipFile();
  try { dest.create(); } catch { /* already exists */ }
  dest.write(base64ToBytes(base64));
  return dest.uri;
}

/**
 * Start playback of a local file uri, wiring auto-release on finish and (when
 * given) reporting progress/start/end so the caller can drive a synced reveal.
 */
function playUri(uri: string, cb?: PlaybackCallbacks): void {
  // Bail if this request was superseded while the clip was being prepared.
  if (cb?.shouldStart && !cb.shouldStart()) return;

  const player = createAudioPlayer({ uri });
  currentPlayer = player;
  let started = false;
  player.addListener('playbackStatusUpdate', (status) => {
    if (currentPlayer !== player) return;
    if (!started && status.playing) {
      started = true;
      cb?.onStart?.();
    }
    if (status.isLoaded && status.duration > 0) {
      const progress = Math.min(1, Math.max(0, status.currentTime / status.duration));
      cb?.onProgress?.(progress);
    }
    if (status.didJustFinish) {
      cb?.onEnd?.();
      stopUplift();
    }
  });
  player.play();
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  try {
    // Play even when the iPad's ring/silent switch is on — kids expect sound.
    await setAudioModeAsync({ playsInSilentMode: true });
    audioModeReady = true;
  } catch (e) {
    console.log('[tts] setAudioModeAsync failed', e);
  }
}

/** Stop + release any Uplift audio currently playing. Safe to call anytime. */
export function stopUplift(): void {
  const player = currentPlayer;
  currentPlayer = null;
  if (player) {
    // PAUSE before remove: on iOS `remove()` alone releases the JS handle but
    // does not reliably halt audio that is already playing, so the voice kept
    // going while a later play stacked a SECOND voice on top. Pausing first
    // silences it immediately; remove() then frees the native resources.
    try { player.pause(); } catch { /* not playing / already released */ }
    try { player.remove(); } catch { /* already released */ }
  }
}

/**
 * Synthesise `text` to a local cache file and return its uri (memoised). One
 * network request per unique text; `downloadFileAsync` rejects on a non-2xx
 * response (so the caller falls back to expo-speech). Returns null only if the
 * write produced no usable file.
 */
async function synthToFile(endpoint: string, text: string): Promise<string | null> {
  const cached = clipCache.get(text);
  if (cached) {
    try { if (new File(cached).exists) return cached; } catch { /* re-synthesise */ }
    clipCache.delete(text);
  }

  const url = `${endpoint}?text=${encodeURIComponent(text)}`;
  const dest = nextClipFile();
  // SDK 54's downloadFileAsync has no `idempotent` option and throws if the
  // destination exists — clear any leftover from a previous session.
  try { if (dest.exists) dest.delete(); } catch { /* best effort */ }
  const file = await File.downloadFileAsync(url, dest);
  const uri = file.uri;
  if (!uri) return null;

  rememberClip(text, uri);
  return uri;
}

/**
 * Play the tutor's PRE-synthesised Urdu clip stored at
 * `audioClips/{roomCode}/{timestamp}` (one RTDB read, no synthesis wait — the
 * voice lands with the text). Memoised, so the ▶ replay button is instant.
 * Resolves `false` when there is no stored clip so the caller can fall back.
 */
export async function speakStoredClip(roomCode: string, timestamp: number, cb?: PlaybackCallbacks): Promise<boolean> {
  if (!firebaseEnabled || !roomCode || !timestamp) return false;
  const key = `stored:${roomCode}:${timestamp}`;
  try {
    const cached = clipCache.get(key);
    if (cached) {
      try {
        if (new File(cached).exists) { await ensureAudioMode(); stopUplift(); playUri(cached, cb); return true; }
      } catch { /* re-fetch below */ }
      clipCache.delete(key);
    }

    const snap = await get(ref(db, `audioClips/${roomCode}/${timestamp}`));
    const val = snap.val() as { data?: string; mime?: string } | null;
    if (!val?.data) return false;

    const uri = writeBase64ToCache(val.data);
    rememberClip(key, uri);
    await ensureAudioMode();
    stopUplift();
    playUri(uri, cb);
    return true;
  } catch (e) {
    console.log('[tts] speakStoredClip failed', e);
    return false;
  }
}

/**
 * Warm a message's PRE-synthesised clip into the local cache WITHOUT playing it,
 * so a later play (auto-play, or the ▶ replay button) starts from a local file
 * with no network round-trip. Only the stored clip is prefetched — it exists
 * once the backend flags `audioReady` — so we never synthesise an on-demand clip
 * the child may never ask for. Idempotent: a cache hit is a no-op.
 */
export async function prefetchClip(
  roomCode: string,
  msg: { timestamp?: number; audioReady?: boolean },
): Promise<void> {
  if (!firebaseEnabled || !roomCode || !msg?.audioReady || !msg.timestamp) return;
  const key = `stored:${roomCode}:${msg.timestamp}`;
  const cached = clipCache.get(key);
  if (cached) {
    try { if (new File(cached).exists) return; } catch { /* re-fetch below */ }
    clipCache.delete(key);
  }
  try {
    const snap = await get(ref(db, `audioClips/${roomCode}/${msg.timestamp}`));
    const val = snap.val() as { data?: string } | null;
    if (val?.data) rememberClip(key, writeBase64ToCache(val.data));
  } catch (e) {
    console.log('[tts] prefetchClip failed', e);
  }
}

/**
 * Synthesise `text` and play it. Resolves `true` when playback starts, `false`
 * when the endpoint is unset or the request / playback fails (so the caller can
 * fall back to expo-speech).
 */
export async function speakViaUplift(text: string, cb?: PlaybackCallbacks): Promise<boolean> {
  const endpoint = process.env.EXPO_PUBLIC_TTS_ENDPOINT;
  const clean = text?.trim();
  if (!endpoint || !clean) return false;

  try {
    const uri = await synthToFile(endpoint, clean);
    if (!uri) return false;

    await ensureAudioMode();
    stopUplift();
    playUri(uri, cb);
    return true;
  } catch (e) {
    console.log('[tts] speakViaUplift failed', e);
    return false;
  }
}
