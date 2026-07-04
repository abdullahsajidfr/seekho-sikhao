import { useRef, useState, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWindow = Window & typeof globalThis & Record<string, any>;

type SpeechState = 'idle' | 'listening' | 'done' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

export function useSpeechRecognition() {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [state, setState]           = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim]       = useState('');

  const w = (typeof window !== 'undefined' ? window : {}) as AnyWindow;
  const supported = 'SpeechRecognition' in w || 'webkitSpeechRecognition' in w;

  const start = useCallback(() => {
    if (!supported) return;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    const r: SpeechRecognitionInstance = new SR();
    r.continuous     = false;
    r.interimResults = true;
    r.lang           = '';  // auto-detect Urdu/English mix

    r.onstart  = () => setState('listening');
    r.onresult = (e: SpeechRecognitionInstance) => {
      let fin = '', int = '';
      for (const res of Array.from(e.results as SpeechRecognitionInstance[])) {
        const r2 = res as SpeechRecognitionInstance;
        if (r2.isFinal) fin += r2[0].transcript;
        else             int += r2[0].transcript;
      }
      if (fin) { setTranscript(fin); setState('done'); }
      setInterim(int);
    };
    r.onerror = () => setState('error');
    r.onend   = () => setState((s: SpeechState) => s === 'listening' ? 'idle' : s);

    recognitionRef.current = r;
    r.start();
    setState('listening');
  }, [supported, w]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState('idle');
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setState('idle');
  }, []);

  return { supported, state, transcript, interim, start, stop, reset };
}
