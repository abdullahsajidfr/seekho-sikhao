import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import { hasUrdu } from '../theme';
import { speakViaUplift, speakStoredClip, stopUplift, prefetchClip, type PlaybackCallbacks } from '../lib/tts';
import type { ChatMessage } from '../types/session';

/**
 * Read-aloud. For each AI message it prefers, in order:
 *   1. the tutor's PRE-synthesised Urdu clip (audioClips/{room}/{timestamp}) —
 *      one RTDB read, so the voice lands with the text, no synthesis wait;
 *   2. the on-demand UpliftAI /api/tts endpoint (src/lib/tts.ts);
 *   3. expo-speech's native TTS.
 * Auto-plays each new AI message when enabled and exposes a manual toggle +
 * speak() for the per-bubble play button. Only one clip plays at a time.
 *
 * speak() is a TOGGLE: calling it with the message that is already playing stops
 * playback. `playingTimestamp` names the message that currently owns the audio
 * channel (or null) and `revealProgress` (0→1) drives that bubble's word-by-word
 * reveal from the live audio position.
 *
 * The playing message NEVER shows its full text first: from the instant speak()
 * (or auto-play) claims the channel it holds at the START of the reveal (first
 * word only) through loading, then animates 0→1 with the voice — so the text is
 * never revealed ahead of a delayed voice, and there is no full→blank→reveal
 * flash. Non-playing / history messages always show their full text.
 */
// Auto-play waits at most this long for a tutor reply's pre-synthesised clip
// (audioReady) before falling back to on-demand synthesis, so the fast stored
// clip is used whenever the backend provides it without hanging if it never does.
const AUTOPLAY_CLIP_GRACE_MS = 4000;

function lastAiMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((m) => m.role === 'ai' && m.type === 'text' && m.text);
}

function speakNative(text: string, onDone: () => void) {
  Speech.speak(text, {
    language: hasUrdu(text) ? 'ur' : 'en-US',
    rate: 0.95,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export function useReadAloud(
  messages: ChatMessage[],
  roomCode: string,
  {
    autoPlay = true,
    onFinishSpeaking,
    suppressGreetingAutoPlay = false,
  }: {
    autoPlay?: boolean;
    onFinishSpeaking?: (timestamp: number) => void;
    // When true, the greeting (the only AI message with no student turn before it)
    // is shown but never auto-read aloud — used for photo-mode entry so no voice
    // plays over the camera flow. Manual replay via speak() is unaffected.
    suppressGreetingAutoPlay?: boolean;
  } = {}
) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  // Which message currently owns the audio channel (drives the pause icon), and
  // how far its voice has progressed (0→1, drives the word-by-word reveal).
  const [playingTimestamp, setPlayingTimestamp] = useState<number | null>(null);
  const [revealProgress, setRevealProgress] = useState(1);

  const lastTimestampRef = useRef<number>(lastAiMessage(messages)?.timestamp ?? 0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;
  // Fired when a real message's audio finishes playing NATURALLY (reaches its end)
  // — not on a manual stop or a read-aloud toggle-off. Lets a screen open the
  // workbook right after the AI finishes reading a practice question aloud (Issue
  // 2). Read via ref so changing the callback never re-creates speak().
  const onFinishRef = useRef(onFinishSpeaking);
  onFinishRef.current = onFinishSpeaking;
  // Read inside the auto-play effect so toggling it never re-creates the effect.
  const suppressGreetingRef = useRef(suppressGreetingAutoPlay);
  suppressGreetingRef.current = suppressGreetingAutoPlay;
  // Mirror of `playingTimestamp` for synchronous reads inside the async speak().
  const playingRef = useRef<number | null>(null);
  // Bumped on every new speak()/stop so a stale in-flight request (e.g. a clip
  // still synthesising when the user taps elsewhere) can neither start playback
  // nor mutate reveal state.
  const epochRef = useRef(0);
  // Auto-play bookkeeping while we hold for a tutor reply's stored clip.
  const pendingRef = useRef<number | null>(null);
  const pendingDeadlineRef = useRef(0);
  const [autoTick, setAutoTick] = useState(0);
  // Last timestamp we warmed into the cache, so prefetch runs once per message.
  const prefetchedRef = useRef(0);

  const resetPlaying = useCallback(() => {
    playingRef.current = null;
    setPlayingTimestamp(null);
    setRevealProgress(1);
  }, []);

  // Put a message into "about to play" reveal mode immediately: it owns the
  // channel (pause icon) and its reveal is pinned to the START (first word) so
  // it never flashes its full text before the word-by-word reveal begins.
  const claimChannel = useCallback((timestamp: number) => {
    playingRef.current = timestamp;
    setPlayingTimestamp(timestamp);
    setRevealProgress(0);
  }, []);

  // Accepts a ChatMessage (preferred — enables the stored-clip fast path) or a
  // plain string for ad-hoc prompts (close-chat cue, reading a question aloud).
  // Toggles: passing the message that is already playing stops it. `force` skips
  // that toggle — used by auto-play, which pre-claims the channel to hold the
  // reveal and would otherwise be misread as a tap-to-stop on its own message.
  const speak = useCallback(async (arg: ChatMessage | string, opts?: { force?: boolean }) => {
    const text = typeof arg === 'string' ? arg : (arg.readAloudText ?? arg.text);
    if (!text) return;
    const audioReady = typeof arg === 'string' ? false : !!arg.audioReady;
    const timestamp = typeof arg === 'string' ? 0 : arg.timestamp;

    // Toggle off: tap the message that is already playing → stop it.
    if (!opts?.force && timestamp !== 0 && playingRef.current === timestamp) {
      epochRef.current++;
      Speech.stop();
      stopUplift();
      resetPlaying();
      setLoading(false);
      return;
    }

    // Stop whatever is currently playing (either path) so only one clip runs.
    const epoch = ++epochRef.current;
    Speech.stop();
    stopUplift();
    setLoading(true);

    const callbacks: PlaybackCallbacks = { shouldStart: () => epochRef.current === epoch };
    if (timestamp !== 0) {
      // Hold the reveal at the start (first word) while the clip loads; it grows
      // from 0 once audio actually begins — never a full-text pre-flash.
      claimChannel(timestamp);
      const active = () => playingRef.current === timestamp && epochRef.current === epoch;
      callbacks.onStart = () => { if (active()) setRevealProgress(0); };
      callbacks.onProgress = (p) => { if (active()) setRevealProgress(p); };
      callbacks.onEnd = () => { if (active()) { resetPlaying(); onFinishRef.current?.(timestamp); } };
    }

    // Native TTS reports no progress, so show the full text (pause icon stays
    // until it finishes). Guarded so a superseded request stays silent.
    const fallbackNative = () => {
      if (epochRef.current !== epoch) return;
      if (timestamp !== 0) setRevealProgress(1);
      speakNative(text, () => {
        setLoading(false);
        if (playingRef.current === timestamp && epochRef.current === epoch) {
          resetPlaying();
          if (timestamp !== 0) onFinishRef.current?.(timestamp);
        }
      });
    };

    try {
      // 1) Pre-synthesised clip stored with the message.
      if (audioReady && (await speakStoredClip(roomCodeRef.current, timestamp, callbacks))) {
        setLoading(false);
        return;
      }
      // 2) On-demand UpliftAI endpoint.
      if (await speakViaUplift(text, callbacks)) {
        setLoading(false);
        return;
      }
      // 3) Native TTS fallback.
      fallbackNative();
    } catch {
      fallbackNative();
    }
  }, [resetPlaying, claimChannel]);

  const cancel = useCallback(() => {
    epochRef.current++;
    pendingRef.current = null;
    Speech.stop();
    stopUplift();
    resetPlaying();
    setLoading(false);
  }, [resetPlaying]);

  // Stop any playback when the consuming screen unmounts.
  useEffect(() => () => { Speech.stop(); stopUplift(); }, []);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    if (!next) {
      cancel();
    } else {
      // Turning read-aloud ON must NOT replay the current message — it only
      // re-enables auto-play for the NEXT new AI message. Mark the newest message
      // as already handled so nothing speaks retroactively.
      const msg = lastAiMessage(messagesRef.current);
      if (msg) lastTimestampRef.current = msg.timestamp;
    }
    setEnabled(next);
  }, [cancel]);

  // Warm the pre-synthesised clip into the cache as soon as the backend flags it
  // ready, so playback (auto-play or the ▶ replay button, incl. the workbook)
  // starts from a local file with no network wait. Once per message.
  useEffect(() => {
    const msg = lastAiMessage(messages);
    if (msg?.audioReady && msg.timestamp !== prefetchedRef.current) {
      prefetchedRef.current = msg.timestamp;
      prefetchClip(roomCodeRef.current, msg);
    }
  }, [messages]);

  // Auto-play each new AI message. Runs in a layout effect so the message enters
  // its reveal-from-start state before the frame paints — no full-text flash.
  useLayoutEffect(() => {
    if (!autoPlay || !enabled) return;
    const msg = lastAiMessage(messages);
    if (!msg || msg.timestamp <= lastTimestampRef.current) return;
    const ts = msg.timestamp;

    // If we were holding for this message's clip but the user has since taken
    // over the audio channel (played/stopped something), abandon — don't yank.
    if (pendingRef.current === ts && playingRef.current !== ts) {
      lastTimestampRef.current = ts;
      pendingRef.current = null;
      return;
    }

    // A greeting is the only AI message with no student turn before it. In photo
    // entry we still SHOW it but must not auto-read it aloud (no voice over the
    // camera flow): mark it handled and skip WITHOUT claiming the channel, so it
    // renders as plain full text. Manual replay (the ▶ button) still works.
    const isReply = messages.some((m) => m.role === 'student' && m.timestamp < ts);
    if (suppressGreetingRef.current && !isReply) {
      lastTimestampRef.current = ts;
      return;
    }

    // Reveal-from-start immediately (kills the pre-flash) even before we commit.
    claimChannel(ts);

    // Prefer the pre-synthesised stored clip for tutor replies: if it isn't
    // ready yet, hold briefly for `audioReady` to flip (the RTDB listener
    // re-runs this effect) rather than paying a redundant on-demand synthesis.
    // Greetings never get a stored clip (no student turn precedes them), so they
    // play immediately. A timer guarantees we never hold forever.
    if (!msg.audioReady && isReply) {
      const now = Date.now();
      if (pendingRef.current !== ts) {
        pendingRef.current = ts;
        pendingDeadlineRef.current = now + AUTOPLAY_CLIP_GRACE_MS;
      }
      if (now < pendingDeadlineRef.current) {
        const remaining = pendingDeadlineRef.current - now;
        const timer = setTimeout(() => setAutoTick((n) => n + 1), remaining);
        return () => clearTimeout(timer);
      }
    }

    lastTimestampRef.current = ts;
    pendingRef.current = null;
    speak(msg, { force: true });
  }, [messages, enabled, autoPlay, autoTick, speak, claimChannel]);

  return { enabled, toggle, loading, speak, playingTimestamp, revealProgress };
}
