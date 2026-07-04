import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { submitWorkbook, requestHint, clearWorkbook, sendStudentMessage, setWorkbookActive } from '../../../firebase/session';
import { uploadCanvasImage } from '../../../firebase/storage';
import { useReadAloud } from '../../../hooks/useReadAloud';
import { useLanguage } from '../../../context/LanguageContext';
import DrawingCanvas, { type DrawingCanvasHandle } from '../components/DrawingCanvas';
import ChatBubble from '../components/ChatBubble';
import ThinkingDots from '../components/ThinkingDots';
import ChatInputBar from '../components/ChatInputBar';
import TopBar from '../components/TopBar';
import { ReadAloudPill, Zap } from '../../../components/icons';
import { logTap } from '../../../lib/autolog';
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

  useEffect(() => {
    if (session?.workbookState.clearSignal) canvasRef.current?.clear();
  }, [session?.workbookState.clearSignal]);

  const messages = session?.chatHistory
    ? Object.values(session.chatHistory).sort((a, b) => a.timestamp - b.timestamp)
    : [];

  const { enabled: readAloud, toggle: toggleReadAloud, speak } = useReadAloud(messages, session?.language ?? 'en', { autoPlay: false });

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
    try {
      const dataUrl = await canvasRef.current?.getImageDataURL();
      let imageUrl: string | undefined;
      if (dataUrl) imageUrl = await uploadCanvasImage(roomCode, dataUrl);
      await submitWorkbook(roomCode, imageUrl);
      log?.('workbook_submitted');
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
              <ChatBubble
                key={msg.id ?? i}
                role={msg.role}
                text={msg.text}
                type={msg.type}
                photoURL={msg.photoURL}
                workbookCorrect={msg.workbookCorrect}
                onSpeak={msg.role === 'ai' ? () => speak(msg.readAloudText ?? msg.text) : undefined}
              />
            ))}
            {session?.showThinking ? <ThinkingDots /> : null}
          </ScrollView>
          <View style={styles.inputWrap}>
            <ChatInputBar roomCode={roomCode} initialMode={inputMode} onSend={handleSend} />
          </View>
        </View>

        {/* RIGHT — canvas */}
        <View style={styles.right}>
          <View style={styles.topStrip}>
            <Text style={styles.questionText} numberOfLines={1}>{currentQuestion ?? subject}</Text>
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
  inputWrap: { paddingVertical: 8, paddingHorizontal: 12 },

  right: { width: '52%', backgroundColor: colors.bg1 },
  topStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6D6',
    backgroundColor: '#FFFBF3',
  },
  questionText: { fontFamily: fonts.body, fontSize: 26, color: '#0C759E', flex: 1 },
  closeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
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
  btnClearText: { fontFamily: fonts.body, fontSize: 24, color: colors.textPrimary },
  btnHint: { backgroundColor: '#FFF9DE', borderWidth: 1, borderColor: '#FF7B00' },
  btnHintText: { fontFamily: fonts.body, fontSize: 24, color: '#FF7B00' },
  btnSubmit: { backgroundColor: colors.primary },
  btnSubmitText: { fontFamily: fonts.body, fontSize: 24, color: '#FFFFFF' },
});
