import { useRef, useState, useCallback, useEffect } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioQuality,
  IOSOutputFormat,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  type RecordingOptions,
} from 'expo-audio';
import { transcribeAudio } from '../lib/stt';

type SpeechState = 'idle' | 'listening' | 'transcribing' | 'done' | 'error';

/**
 * Safety valve: never leave the mic "listening" forever (e.g. the child taps mic
 * and walks away). After this we auto-stop and transcribe so the UI can never
 * wedge on the waveform.
 */
const MAX_LISTEN_MS = 120_000;

/**
 * Record a short WAV clip (16 kHz mono — small and Gemini-friendly) so the
 * server can transcribe it. WAV/linear-PCM is used because Gemini's audio input
 * accepts wav but not the m4a container.
 */
const WAV_RECORDING: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

/**
 * Voice input state machine with REAL speech-to-text.
 *
 * `start()` requests mic permission and begins recording (drives the waveform).
 * `stop()` ends recording, uploads the clip to the STT endpoint, and puts the
 * transcript in `transcript` with state 'done' — ChatInputBar then drops it into
 * the editable text box so the child can review/edit before sending. `reset()`
 * clears everything. Every transition is guarded so the mic can't get stuck; if
 * recording or transcription fails we land in 'error' and the child can type.
 */
export function useSpeechRecognition() {
  const recorder = useAudioRecorder(WAV_RECORDING);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  // Local file URI of the last captured clip, exposed so ChatInputBar can upload
  // it to Storage when the child sends the (voice) message.
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const supported = true;

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  // Stop recording + transcribe. Declared before start() so the safety timer can
  // reference it.
  const stop = useCallback(async () => {
    clearSafetyTimer();
    setState((s) => (s === 'listening' ? 'transcribing' : s));
    try {
      if (recorder.isRecording) await recorder.stop();
      const uri = recorder.uri;
      // Keep the clip URI around even if transcription fails — the send path
      // still uploads the audio best-effort.
      setAudioUri(uri ?? null);
      const text = uri ? await transcribeAudio(uri, 'audio/wav') : '';
      setTranscript(text);
      setState('done');
    } catch (e) {
      console.log('[stt] stop/transcribe failed', e);
      setState('error');
    }
  }, [recorder, clearSafetyTimer]);

  const start = useCallback(async () => {
    clearSafetyTimer();
    setTranscript('');
    setInterim('');
    setAudioUri(null);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { setState('error'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('listening');
      // Auto-stop guard so the mic can never get stuck listening.
      safetyTimerRef.current = setTimeout(() => { stop(); }, MAX_LISTEN_MS);
    } catch (e) {
      console.log('[stt] start recording failed', e);
      setState('error');
    }
  }, [recorder, clearSafetyTimer, stop]);

  const reset = useCallback(() => {
    clearSafetyTimer();
    setTranscript('');
    setInterim('');
    setAudioUri(null);
    setState('idle');
    // Best-effort: abandon any in-flight recording so a fresh start is clean.
    try { if (recorder.isRecording) recorder.stop(); } catch { /* ignore */ }
  }, [recorder, clearSafetyTimer]);

  // Release the timer if the consuming screen unmounts mid-recording.
  useEffect(() => clearSafetyTimer, [clearSafetyTimer]);

  return { supported, state, transcript, interim, audioUri, start, stop, reset };
}
