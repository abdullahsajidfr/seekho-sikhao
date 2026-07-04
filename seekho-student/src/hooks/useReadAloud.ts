import { useState, useCallback, useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import { hasUrdu } from '../theme';
import type { ChatMessage } from '../types/session';

/**
 * Read-aloud powered by expo-speech (native TTS), replacing the web build's
 * /api/tts + <audio> path. Auto-plays each new AI message when enabled and
 * exposes a manual toggle + speak() for the per-bubble play button. The chosen
 * TTS locale follows the text: Urdu-script strings use `ur`, otherwise `en`.
 */
function lastAiMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((m) => m.role === 'ai' && m.type === 'text' && m.text);
}

export function useReadAloud(
  messages: ChatMessage[],
  _language: 'en' | 'ur',
  { autoPlay = true }: { autoPlay?: boolean } = {}
) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const lastTimestampRef = useRef<number>(lastAiMessage(messages)?.timestamp ?? 0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const speak = useCallback((text: string) => {
    if (!text) return;
    Speech.stop();
    setLoading(true);
    Speech.speak(text, {
      language: hasUrdu(text) ? 'ur' : 'en-US',
      rate: 0.95,
      onDone: () => setLoading(false),
      onStopped: () => setLoading(false),
      onError: () => setLoading(false),
    });
  }, []);

  const cancel = useCallback(() => {
    Speech.stop();
    setLoading(false);
  }, []);

  // Stop any playback when the consuming screen unmounts.
  useEffect(() => () => { Speech.stop(); }, []);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
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
