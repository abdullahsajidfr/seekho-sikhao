import { useState, useEffect } from 'react';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { uploadPhoto } from '../../../firebase/storage';
import CameraScreen from './CameraScreen';
import styles from './ChatInputBar.module.css';
import type { MessageType, StudentMessageType } from '../../../types/session';

const BAR_COUNT = 36;
// Varied heights (8–40px) using a sine pattern for a natural waveform look
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const t = i / (BAR_COUNT - 1);
  return Math.round(8 + 32 * Math.abs(Math.sin(t * Math.PI * 4.2 + 0.8)));
});

function formatTime(secs: number) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  roomCode: string;
  initialMode?: MessageType;
  onSend: (payload: { text: string; type: StudentMessageType; photoURL?: string; voiceTranscript?: string }) => void;
  onInputFocus?: () => void;
}

export default function ChatInputBar({ roomCode, initialMode, onSend, onInputFocus }: Props) {
  const [text, setText]           = useState('');
  const [busy, setBusy]           = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [elapsed, setElapsed]     = useState(0);
  // Photo mode opens the camera immediately (lazy init avoids an open/close flash).
  const [showCamera, setShowCamera] = useState(initialMode === 'photo');
  const { state: srState, transcript, interim, start, stop, reset } = useSpeechRecognition();

  useEffect(() => {
    if (initialMode === 'voice') start();
  }, []);

  const isListening = srState === 'listening';
  const hasTranscript = srState === 'done' && transcript;

  useEffect(() => {
    if (!isListening) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isListening]);

  async function handleSend() {
    if (busy) return;
    if (text.trim()) {
      onSend({ text: text.trim(), type: 'text' });
      setText('');
    } else if (hasTranscript) {
      onSend({ text: transcript, type: 'voice', voiceTranscript: transcript });
      reset();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  async function processPhoto(file: File) {
    const localUrl = URL.createObjectURL(file);
    setPendingPhoto(localUrl);
    setBusy(true);
    try {
      const url = await uploadPhoto(roomCode, file);
      onSend({ text: '', type: 'photo', photoURL: url });
    } finally {
      setBusy(false);
      URL.revokeObjectURL(localUrl);
      setPendingPhoto(null);
    }
  }

  function handleMicClick() {
    if (isListening) { stop(); }
    else if (hasTranscript) { reset(); }
    else { start(); }
  }

  function handleVoiceSend() {
    const textToSend = transcript || interim;
    stop();
    if (textToSend) {
      onSend({ text: textToSend, type: 'voice', voiceTranscript: textToSend });
    }
    reset();
  }

  return (
    <div className={styles.bar}>
      {/* Pending photo preview while uploading */}
      {pendingPhoto && (
        <div className={styles.pendingWrap}>
          <img src={pendingPhoto} alt="" className={styles.pendingImg} />
          <div className={styles.pendingOverlay}>
            <span className={styles.pendingLabel}>Uploading…</span>
          </div>
        </div>
      )}

      {/* Waveform card — shown while mic is active */}
      {isListening && (
        <div className={styles.waveformCard}>
          <div className={styles.waveformTop}>
            <div className={styles.waveBars}>
              {BAR_HEIGHTS.map((h, i) => (
                <span
                  key={i}
                  className={styles.waveBar}
                  style={{ height: h, animationDelay: `${(i * 42) % 560}ms` }}
                />
              ))}
            </div>
            <span className={styles.waveTimer}>{formatTime(elapsed)}</span>
          </div>
          {interim && (
            <p className={styles.waveInterim}>{interim}</p>
          )}
          <div className={styles.waveActions}>
            <button className={styles.waveDeleteBtn} data-log="student:voice-cancel" onClick={() => { stop(); reset(); }} aria-label="Cancel recording">
              <img src="/icons/delete.png" alt="" className={styles.waveDeleteIcon} />
            </button>
            <button className={styles.waveSendBtn} data-log="student:send-voice" onClick={handleVoiceSend} aria-label="Send">
              <img src="/icons/send.svg" alt="" className={styles.waveSendIcon} />
            </button>
          </div>
        </div>
      )}

      {/* Transcript display — shown after speech is captured */}
      {hasTranscript && (
        <div className={styles.inputArea}>
          <p className={styles.voiceDisplay}>{transcript}</p>
        </div>
      )}

      {/* Text input — shown when not in voice mode */}
      {!isListening && !hasTranscript && (
        <div className={styles.inputArea}>
          <textarea
            className={styles.textInput}
            placeholder="Type your question…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={onInputFocus}
            rows={1}
          />
        </div>
      )}

      {/* Bottom action row — hidden while waveform is showing */}
      {!isListening && (
        <div className={styles.actions}>
          <div className={styles.leftIcons}>
            <button
              className={styles.iconBtn}
              onClick={handleMicClick}
              aria-label="Voice input"
              data-log="student:mic"
            >
              <img src="/icons/mic.svg" alt="" className={styles.iconImg} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setShowCamera(true)}
              disabled={busy}
              aria-label="Camera"
              data-log="student:camera"
            >
              <img src="/icons/camera.svg" alt="" className={styles.iconImgCamera} />
            </button>
          </div>
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!text.trim() && !hasTranscript}
            aria-label="Send"
            data-log="student:send"
          >
            <img src="/icons/send.svg" alt="" className={styles.sendIcon} />
          </button>
        </div>
      )}

      {showCamera && (
        <CameraScreen
          onCapture={(file) => { setShowCamera(false); processPhoto(file); }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
