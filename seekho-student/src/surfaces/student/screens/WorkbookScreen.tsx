import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { submitWorkbook, requestHint, clearWorkbook, sendStudentMessage, setWorkbookActive } from '../../../firebase/session';
import { useReadAloud } from '../../../hooks/useReadAloud';
import { useLanguage } from '../../../context/LanguageContext';
import DrawingCanvas, { type DrawingCanvasHandle } from '../components/DrawingCanvas';
import ChatBubble from '../components/ChatBubble';
import ThinkingDots from '../components/ThinkingDots';
import ChatInputBar from '../components/ChatInputBar';
import WorkbookQuestionCard from '../components/WorkbookQuestionCard';
import TopBar from '../components/TopBar';
import { ReadAloudPill, Zap, Speaker } from '../../../components/icons';
import { logTap } from '../../../lib/autolog';
import { urduAwareTextStyle } from '../../../lib/textStyle';
import { colors, fonts } from '../../../theme';
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
  const { t } = useLanguage();
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = session?.workbookState.submitted ?? false;

  // Only clear the canvas for a genuinely NEW clear signal. Several writes REPLACE
  // the whole workbookState object (submitWorkbook, setWorkbookActive), dropping
  // clearSignal, so the raw value flip-flops as RTDB re-delivers snapshots — which
  // would spuriously wipe the child's strokes mid-writing (Issue 1). We remember
  // the last clearSignal we handled and ignore falsy/initial/repeat values. The
  // Clear button already clears the canvas directly (see its onPress), so this
  // effect only needs to serve a genuine remote/re-issued clear.
  const handledClearRef = useRef<number>(session?.workbookState.clearSignal ?? 0);
  useEffect(() => {
    const sig = session?.workbookState.clearSignal ?? 0;
    if (sig && sig !== handledClearRef.current) {
      handledClearRef.current = sig;
      canvasRef.current?.clear();
    }
  }, [session?.workbookState.clearSignal]);

  const messages = session?.chatHistory
    ? Object.values(session.chatHistory).sort((a, b) => a.timestamp - b.timestamp)
    : [];

  // autoPlay so the AI's hint and graded-submit feedback auto-speak when they land
  // (Issue 5). Only one of Chat/Workbook is mounted at a time, so no double-speak.
  const { enabled: readAloud, toggle: toggleReadAloud, speak, playingTimestamp, revealProgress } = useReadAloud(messages, roomCode, { autoPlay: true });

  const currentQuestion = messages.filter((m) => m.workbookQuestion).at(-1)?.workbookQuestion ?? null;

  async function handleSend(payload: { text: string; type: StudentMessageType; photoURL?: string; voiceTranscript?: string }) {
    await sendStudentMessage(roomCode, payload);
  }

  function handleClose() {
    logTap('student:workbook-close');
    setWorkbookActive(roomCode, false);
    onBack();
  }

  async function handleSubmit() {
    if (submitting || submitted) return;
    setSubmitting(true);
    // Capture the child's handwriting as a base64 data URI and send it STRAIGHT to
    // the tutor — no Firebase Storage upload (Storage is misconfigured and throws
    // storage/unknown; Issue 3). The backend decodes `data:` image URIs inline for
    // Gemini vision, so writing this to workbookState.canvasImageURL is exactly
    // what lets the AI read and grade the handwriting (Issue 4). Capture is
    // best-effort: a failure must never block the submit or leak an uncaught
    // rejection — the image is optional and the workbook still submits.
    let dataUrl: string | undefined;
    try {
      dataUrl = (await canvasRef.current?.getImageDataURL()) ?? undefined;
    } catch {
      dataUrl = undefined;
    }
    try {
      await submitWorkbook(roomCode, dataUrl);
      log?.('workbook_submitted');
    } catch {
      // submitWorkbook is fire-and-forget from the UI's perspective; swallow so
      // tapping Submit can never surface an uncaught promise rejection (Issue 3).
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.page}>
      <TopBar
        title={subject}
        showBack
        onBack={onBack}
        rightSlot={
          <Pressable onPress={() => { logTap('student:read-aloud'); toggleReadAloud(); }} accessibilityLabel="Toggle read aloud">
            <ReadAloudPill label={t('read_aloud')} active={readAloud} />
          </Pressable>
        }
      />

      <View style={styles.panels}>
        {/* LEFT — chat */}
        <View style={styles.left}>
          <ScrollView
            ref={scrollRef}
            style={styles.chatHistory}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg, i) => (
              <View key={msg.id ?? i} style={styles.msgWrap}>
                <ChatBubble
                  role={msg.role}
                  text={msg.text}
                  type={msg.type}
                  photoURL={msg.photoURL}
                  workbookCorrect={msg.workbookCorrect}
                  isHint={msg.isHint}
                  isCorrect={msg.isCorrect}
                  compact
                  onSpeak={msg.role === 'ai' ? () => speak(msg) : undefined}
                  isPlaying={msg.role === 'ai' && playingTimestamp === msg.timestamp}
                  revealProgress={playingTimestamp === msg.timestamp ? revealProgress : undefined}
                />
                {/* Keep the practice question visible in chat while the workbook is open (Item B). */}
                {msg.workbookQuestion ? (
                  <WorkbookQuestionCard question={msg.workbookQuestion} readOnly compact />
                ) : null}
              </View>
            ))}
            {session?.showThinking ? <ThinkingDots /> : null}
          </ScrollView>
          <View style={styles.inputWrap}>
            <ChatInputBar roomCode={roomCode} initialMode={inputMode} onSend={handleSend} compact />
          </View>
        </View>

        {/* RIGHT — canvas */}
        <View style={styles.right}>
          <View style={styles.topStrip}>
            {/* Speaker reads the current question aloud (Item E). */}
            <Pressable
              style={styles.qSpeakBtn}
              onPress={() => { logTap('student:workbook-speak-question'); speak(currentQuestion ?? subject); }}
              hitSlop={8}
              accessibilityLabel="Read question aloud"
            >
              <Speaker width={22} height={22} color={colors.primary} />
            </Pressable>
            <Text style={urduAwareTextStyle(currentQuestion ?? subject, styles.questionText)}>{currentQuestion ?? subject}</Text>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8} accessibilityLabel="Close workbook">
              <Text style={styles.closeX}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.canvasWrap}>
            <DrawingCanvas ref={canvasRef} />
          </View>

          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnClear]} onPress={() => { logTap('student:workbook-clear'); canvasRef.current?.clear(); clearWorkbook(roomCode); }}>
              <Text style={styles.btnClearText}>{t('workbook_clear')}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnHint]} onPress={() => { logTap('student:workbook-hint'); log?.('workbook_hint_tapped'); requestHint(roomCode); }}>
              <Zap width={16} height={17} color="#FF7B00" />
              <Text style={styles.btnHintText}>{t('hint')}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnSubmit, (submitted || submitting) && styles.btnDisabled]} disabled={submitted || submitting} onPress={() => { logTap('student:workbook-submit'); handleSubmit(); }}>
              <Text style={styles.btnSubmitText}>{submitting ? t('sending') : submitted ? 'Submitted' : t('workbook_submit')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg1 },
  panels: { flex: 1, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  left: { width: '48%', borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.bgChat },
  chatHistory: { flex: 1 },
  chatContent: { padding: 16, gap: 16 },
  msgWrap: { gap: 10 },
  inputWrap: { paddingVertical: 8, paddingHorizontal: 12 },

  right: { width: '52%', backgroundColor: colors.bg1 },
  topStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6D6',
    backgroundColor: '#FFFBF3',
  },
  qSpeakBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(42,186,242,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Bigger, wraps to the full problem (Item B).
  questionText: { fontFamily: fonts.bodyMedium, fontSize: 22, lineHeight: 30, color: '#0C759E', flex: 1 },
  closeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, flexShrink: 0 },
  closeX: { fontSize: 20, color: '#E07B39' },

  canvasWrap: {
    flex: 1,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E7E0D2',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12, justifyContent: 'center' },
  btn: { flex: 1, height: 44, borderRadius: 100, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  btnDisabled: { opacity: 0.4 },
  btnClear: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  btnClearText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.textPrimary },
  btnHint: { backgroundColor: '#FFF9DE', borderWidth: 1, borderColor: '#FF7B00' },
  btnHintText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: '#FF7B00' },
  btnSubmit: { backgroundColor: colors.primary },
  btnSubmitText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: '#FFFFFF' },
});
