import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/session';

const STORAGE_KEY = 'readAloud';


// One shared element for the whole session. Reusing it preserves iOS's audio
// unlock state — creating a new element each time loses it after the first clip.
const sharedAudio = new Audio();
sharedAudio.volume = 1.0;

// iOS blocks audio.play() from non-gesture contexts until the element has been
// play()'d at least once inside a real user gesture. We fire a silent unlock
// on the first tap anywhere on the page — which happens naturally before any
// AI message arrives (subject selection, typing, etc.).
// Use a silent data URI so the unlock never interrupts real playback.
const SILENT_SRC = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
let unlocked = false;
function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  // Only unlock with a silent clip — never touch sharedAudio while it may be playing
  const tmp = new Audio(SILENT_SRC);
  tmp.play().catch(() => {});
}
document.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
document.addEventListener('click',      unlockAudio, { once: true });

function lastAiMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find(m => m.role === 'ai' && m.type === 'text' && m.text);
}

export function useReadAloud(messages: ChatMessage[], _language: 'en' | 'ur', { autoPlay = true }: { autoPlay?: boolean } = {}) {
  const [enabled, setEnabled] = useState(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [loading, setLoading] = useState(false);

  const lastTimestampRef = useRef<number>(lastAiMessage(messages)?.timestamp ?? 0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Wire up audio events once; stop playback when the consuming screen unmounts
  useEffect(() => {
    const audio = sharedAudio;
    const onCanPlay = () => setLoading(false);
    const onEnded   = () => setLoading(false);
    const onError   = () => setLoading(false);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended',   onEnded);
    audio.addEventListener('error',   onError);
    return () => {
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended',   onEnded);
      audio.removeEventListener('error',   onError);
      audio.pause();
    };
  }, []);

  const speak = useCallback((text: string) => {
    sharedAudio.pause();
    sharedAudio.volume = 1.0;
    setLoading(true);
    sharedAudio.src = `/api/tts?text=${encodeURIComponent(text)}`;
    sharedAudio.load();
    sharedAudio.play().catch(() => setLoading(false));
  }, []);

  const cancel = useCallback(() => {
    sharedAudio.pause();
    setLoading(false);
  }, []);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    sessionStorage.setItem(STORAGE_KEY, String(next));
    if (!next) {
      cancel();
    } else {
      const msg = lastAiMessage(messagesRef.current);
      if (msg) {
        lastTimestampRef.current = msg.timestamp;
        speak(msg.readAloudText ?? msg.text);
      }
    }
    setEnabled(next);
  }, [speak, cancel]);

  useEffect(() => {
    if (!autoPlay || !enabled) return;
    const msg = lastAiMessage(messages);
    if (!msg || msg.timestamp <= lastTimestampRef.current) return;
    lastTimestampRef.current = msg.timestamp;
    speak(msg.readAloudText ?? msg.text);
  }, [messages, enabled, speak, autoPlay]);

  return { enabled, toggle, loading, speak };
}
