import { useRef, useState, useEffect } from 'react';
import { submitWorkbook, requestHint, clearWorkbook, sendStudentMessage, setWorkbookActive } from '../../../firebase/session';
import { useReadAloud } from '../../../hooks/useReadAloud';
import { uploadCanvasImage } from '../../../firebase/storage';
import DrawingCanvas, { type DrawingCanvasHandle } from '../components/DrawingCanvas';
import ChatBubble from '../components/ChatBubble';
import ThinkingDots from '../components/ThinkingDots';
import ChatInputBar from '../components/ChatInputBar';
import TopBar from '../components/TopBar';
import styles from './WorkbookScreen.module.css';
import type { MessageType, StudentMessageType, Session, Subject } from '../../../types/session';

interface Props {
  roomCode: string;
  subject: Subject;
  session: Session | null;
  inputMode: MessageType;
  onBack: () => void;
  log?: (label: string) => void;
}

export default function WorkbookScreen({ roomCode, subject, session, inputMode, onBack, log }: Props) {
  const canvasRef   = useRef<DrawingCanvasHandle>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted   = session?.workbookState.submitted ?? false;

  useEffect(() => {
    if (session?.workbookState.clearSignal) canvasRef.current?.clear();
  }, [session?.workbookState.clearSignal]);

  const messages = session?.chatHistory
    ? Object.values(session.chatHistory).sort((a, b) => a.timestamp - b.timestamp)
    : [];

  const { enabled: readAloud, toggle: toggleReadAloud, loading: ttsLoading, speak } = useReadAloud(messages, session?.language ?? 'en', { autoPlay: false });

  const currentQuestion = messages
    .filter(m => m.workbookQuestion)
    .at(-1)?.workbookQuestion ?? null;

  async function handleSend(payload: { text: string; type: StudentMessageType; photoURL?: string; voiceTranscript?: string }) {
    await sendStudentMessage(roomCode, payload);
  }

  async function handleSubmit() {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const dataUrl = canvasRef.current?.getImageDataURL() ?? null;
      let imageUrl: string | undefined;
      if (dataUrl) imageUrl = await uploadCanvasImage(roomCode, dataUrl);
      await submitWorkbook(roomCode, imageUrl);
      log?.('workbook_submitted');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <TopBar
        title={subject}
        showBack
        onBack={onBack}
        rightSlot={
          <button className={`${styles.readAloudBtn} ${ttsLoading ? styles.readAloudLoading : ''}`} onClick={toggleReadAloud} aria-label="Toggle read aloud">
            <img
              src={readAloud ? '/icons/read-aloud-on.svg' : '/icons/read-aloud-off.svg'}
              alt=""
              className={styles.readAloudIcon}
            />
          </button>
        }
      />

      <div className={styles.panels}>
        {/* LEFT 35% — chat */}
        <div className={styles.left}>
          <div className={styles.chatHistory}>
            {messages.map((msg, i) => (
              <ChatBubble key={msg.id ?? i} role={msg.role} text={msg.text} type={msg.type} photoURL={msg.photoURL} workbookCorrect={msg.workbookCorrect} onSpeak={msg.role === 'ai' ? () => speak(msg.readAloudText ?? msg.text) : undefined} />
            ))}
            {session?.showThinking && <ThinkingDots />}
            <div ref={bottomRef} />
          </div>
          <div className={styles.inputWrap}>
            <ChatInputBar roomCode={roomCode} initialMode={inputMode} onSend={handleSend} />
          </div>
        </div>

        {/* RIGHT 65% — canvas, no selection, no touch gestures */}
        <div className={styles.right}>
          {/* Question header + close */}
          <div className={styles.topStrip}>
            <p className={styles.questionText}>{currentQuestion ?? subject}</p>
            <button
              className={styles.closeBtn}
              onClick={() => { onBack(); setWorkbookActive(roomCode, false); }}
              aria-label="Close workbook"
            >
              ✕
            </button>
          </div>

          <div className={styles.canvasWrap}>
            <DrawingCanvas ref={canvasRef} />
          </div>

          <div className={styles.actions}>
            <button className={styles.btnClear} onClick={() => { canvasRef.current?.clear(); clearWorkbook(roomCode); }}>
              Clear
            </button>
            <button className={styles.btnHint} onClick={() => { log?.('workbook_hint_tapped'); requestHint(roomCode); }}>
              <img src="/icons/zap.svg" alt="" className={styles.zapIcon} />
              Hint
            </button>
            <button
              className={styles.btnSubmit}
              disabled={submitted || submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Sending…' : submitted ? 'Submitted' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
