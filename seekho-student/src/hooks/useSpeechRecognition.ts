import { useRef, useState, useCallback } from 'react';

type SpeechState = 'idle' | 'listening' | 'done' | 'error';

/**
 * Expo Go has no on-device speech-to-text, so this simulates the recording
 * state machine that drives the voice UI (waveform / timer / send). The child
 * speaks aloud, the tester hears it, and the Wizard supplies the AI reply — so
 * an exact transcript is not required for the WoZ flow. `start()` enters the
 * "listening" state (animated waveform); `stop()` returns to idle. No real
 * transcript is produced; see the ChatInputBar for how a voice message is sent.
 */
export function useSpeechRecognition() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');

  const supported = true; // simulated — always "available"

  const start = useCallback(() => {
    setTranscript('');
    setInterim('');
    setState('listening');
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('idle');
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setState('idle');
  }, []);

  return { supported, state, transcript, interim, start, stop, reset };
}
