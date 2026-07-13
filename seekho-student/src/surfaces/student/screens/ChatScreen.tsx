import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { sendGreeting, sendStudentMessage, setShowEndModal, clearCurrentChat } from '../../../firebase/session';
import { useReadAloud } from '../../../hooks/useReadAloud';
import { useLanguage } from '../../../context/LanguageContext';
import ChatBubble from '../components/ChatBubble';
import ThinkingDots from '../components/ThinkingDots';
import ChatInputBar from '../components/ChatInputBar';
import WorkbookQuestionCard from '../components/WorkbookQuestionCard';
import TopBar from '../components/TopBar';
import { ChatOptionsMenu, RenameModal, DeleteModal, type Anchor } from '../components/overlays';
import { ReadAloudPill } from '../../../components/icons';
import { logTap } from '../../../lib/autolog';
import { urduAwareTextStyle } from '../../../lib/textStyle';
import { colors, fonts } from '../../../theme';
import type { MessageType, StudentMessagePayload, Session, Subject } from '../../../types/session';

interface Props {
  roomCode: string;
  subject: Subject;
  inputMode: MessageType;
  session: Session | null;
  onBack: (chatName?: string) => void;
  onCloseChat: (chatName?: string) => void;
  onDeleteChat: () => void;
  onOpenWorkbook: () => void;
  log?: (label: string) => void;
}

export default function ChatScreen({ roomCode, subject, inputMode, session, onBack, onCloseChat, onDeleteChat, onOpenWorkbook, log }: Props) {
  const { t } = useLanguage();
  const scrollRef = useRef<ScrollView>(null);
  const greetedRef = useRef(false);
  const menuBtnRef = useRef<View>(null);

  const [chatName, setChatName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  // Screen position of the ··· button so the menu (and the Rename/Delete modals
  // it opens) drop down directly beneath it instead of centre-screen.
  const [menuAnchor, setMenuAnchor] = useState<Anchor | undefined>(undefined);
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [deletingOpen, setDeletingOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const messages = session?.chatHistory
    ? Object.values(session.chatHistory).sort((a, b) => a.timestamp - b.timestamp)
    : [];

  // ── Auto-open the workbook after the AI finishes reading a practice question ──
  // (Issue 2). When a NEW ai message carrying a `workbookQuestion` arrives, we
  // open the whiteboard AFTER its read-aloud finishes (so the child hears the
  // explanation first); if read-aloud is off, we open ~800ms after it appears.
  // `handledOpenRef` seeds to the newest AI message present at MOUNT, so a
  // question that already exists — e.g. right after the child closes the workbook
  // and this screen remounts — never re-opens it. Only a strictly-newer message
  // can open, and each opens exactly once.
  const onOpenWorkbookRef = useRef(onOpenWorkbook);
  onOpenWorkbookRef.current = onOpenWorkbook;
  const handledOpenRef = useRef<number>(
    messages.reduce((mx, m) => (m.role === 'ai' ? Math.max(mx, m.timestamp) : mx), 0)
  );
  const pendingOpenTsRef = useRef<number | null>(null);

  const openWorkbookOnce = useCallback((ts: number) => {
    if (ts <= handledOpenRef.current) return;
    handledOpenRef.current = ts;
    pendingOpenTsRef.current = null;
    onOpenWorkbookRef.current();
  }, []);

  // Read-aloud path: the message auto-plays; open the moment its audio ends.
  const handleFinishSpeaking = useCallback((ts: number) => {
    if (pendingOpenTsRef.current === ts) openWorkbookOnce(ts);
  }, [openWorkbookOnce]);

  const { enabled: readAloud, toggle: toggleReadAloud, speak, loading, playingTimestamp, revealProgress } =
    useReadAloud(messages, roomCode, {
      onFinishSpeaking: handleFinishSpeaking,
      // Photo-mode entry: show the greeting as text but do NOT auto-read it aloud,
      // so no AI voice plays over the camera/photo flow. Only the greeting (the one
      // AI message with no student turn before it) is affected; later replies
      // auto-play normally and the child can still tap the bubble to hear it.
      suppressGreetingAutoPlay: inputMode === 'photo',
    });

  // The tutor is "speaking" while a clip is playing OR still loading; the mic
  // holds (waitingForAi) until this clears so it never records the AI's voice.
  const aiSpeaking = playingTimestamp != null || loading;

  // Mirror of `readAloud` read INSIDE the auto-open effect. Kept out of the
  // effect deps on purpose: toggling read-aloud must not re-run the effect —
  // doing so fired the fallback timer and force-opened the workbook, trapping the
  // child on that page when they only meant to mute the voice.
  const readAloudRef = useRef(readAloud);
  readAloudRef.current = readAloud;

  useEffect(() => {
    const lastAi = [...messages].reverse().find((m) => m.role === 'ai');
    if (!lastAi?.workbookQuestion) return;
    const ts = lastAi.timestamp;
    if (ts <= handledOpenRef.current) return; // already handled / existed at mount
    pendingOpenTsRef.current = ts;
    // Decide the open path ONCE, from the read-aloud state when the message
    // arrives. With read-aloud on, the auto-play reads it and onFinishSpeaking(ts)
    // opens the workbook when the voice ends. With it off, fall back to opening
    // shortly after it appears. Toggling read-aloud later never re-triggers this.
    if (readAloudRef.current) return;
    const timer = setTimeout(() => openWorkbookOnce(ts), 800);
    return () => clearTimeout(timer);
  }, [messages, openWorkbookOnce]);

  // Read the close-chat prompt aloud once when it appears (Item D).
  const spokeClosePromptRef = useRef(false);
  useEffect(() => {
    const visible = !!session?.showEndModal;
    if (visible && !spokeClosePromptRef.current) {
      spokeClosePromptRef.current = true;
      speak(t('close_chat_read'));
    }
    if (!visible) spokeClosePromptRef.current = false;
  }, [session?.showEndModal, speak, t]);

  useEffect(() => {
    if (greetedRef.current || !session) return;
    greetedRef.current = true;
    if (!session.chatHistory) {
      const greeting = session.greetings[subject];
      if (greeting) sendGreeting(roomCode, greeting, session.greetingsReadAloud?.[subject]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleSend(payload: StudentMessagePayload) {
    log?.('ai_message_sent');
    await sendStudentMessage(roomCode, payload);
  }

  async function handleDelete() {
    if (deleteBusy) return;
    setDeleteBusy(true);
    await clearCurrentChat(roomCode);
    setDeleteBusy(false);
    setDeletingOpen(false);
    onDeleteChat();
  }

  // Measure the ··· button and drop the menu just under it (right-aligned).
  function openChatMenu() {
    logTap('student:chat-menu');
    const node = menuBtnRef.current;
    if (node?.measureInWindow) {
      node.measureInWindow((x, y, w, h) => {
        setMenuAnchor({ top: y + h + 8, right: Math.max(12, Dimensions.get('window').width - (x + w)) });
        setMenuOpen(true);
      });
    } else {
      setMenuOpen(true);
    }
  }

  const rightSlot = (
    <View style={styles.topActions}>
      <Pressable onPress={() => { logTap('student:read-aloud'); toggleReadAloud(); }} accessibilityLabel="Toggle read aloud">
        <ReadAloudPill label={t('read_aloud')} active={readAloud} />
      </Pressable>
      <Pressable ref={menuBtnRef} style={styles.menuDotBtn} onPress={openChatMenu} hitSlop={8} accessibilityLabel="Chat options">
        <Text style={styles.dots}>···</Text>
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title={subject} showBack onBack={() => onBack(chatName || undefined)} rightSlot={rightSlot} />

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
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
              readAloudText={msg.readAloudText}
              onSpeak={msg.role === 'ai' ? () => speak(msg) : undefined}
              isPlaying={msg.role === 'ai' && playingTimestamp === msg.timestamp}
              revealProgress={playingTimestamp === msg.timestamp ? revealProgress : undefined}
            />
            {msg.workbookQuestion ? (
              <View style={styles.qCardWrap}>
                <WorkbookQuestionCard question={msg.workbookQuestion} onTry={() => { logTap('student:try-question'); onOpenWorkbook(); }} />
              </View>
            ) : null}
          </View>
        ))}
        {session?.showThinking ? <ThinkingDots /> : null}
      </ScrollView>

      {session?.showEndModal ? (
        <View style={styles.endPrompt}>
          <Text style={urduAwareTextStyle(t('close_chat_q'), styles.endQuestion)}>{t('close_chat_q')}</Text>
          <View style={styles.endActions}>
            {/* Safe / keep action — green */}
            <Pressable style={[styles.endBtn, styles.endKeep]} onPress={() => { logTap('student:close-chat-keep'); setShowEndModal(roomCode, false); }}>
              <Text style={urduAwareTextStyle(t('close_chat_no'), styles.endKeepText)}>{t('close_chat_no')}</Text>
            </Pressable>
            {/* Destructive / close action — red */}
            <Pressable style={[styles.endBtn, styles.endClose]} onPress={async () => { logTap('student:close-chat-confirm'); await setShowEndModal(roomCode, false); onCloseChat(chatName || undefined); }}>
              <Text style={urduAwareTextStyle(t('close_chat_yes'), styles.endCloseText)}>{t('close_chat_yes')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.inputWrap}>
        <ChatInputBar
          roomCode={roomCode}
          initialMode={inputMode}
          onSend={handleSend}
          aiSpeaking={aiSpeaking}
          onInputFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
        />
      </View>

      {menuOpen ? (
        <ChatOptionsMenu
          anchor={menuAnchor}
          onClose={() => setMenuOpen(false)}
          onRename={() => { setMenuOpen(false); setRenamingOpen(true); }}
          onDelete={() => { setMenuOpen(false); setDeletingOpen(true); }}
        />
      ) : null}

      {renamingOpen ? (
        <RenameModal initial={chatName} onCancel={() => setRenamingOpen(false)} onSave={(name) => { setChatName(name); setRenamingOpen(false); }} />
      ) : null}

      {deletingOpen ? (
        <DeleteModal busy={deleteBusy} onCancel={() => setDeletingOpen(false)} onDelete={handleDelete} />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgChat },
  messages: { flex: 1 },
  messagesContent: { paddingVertical: 16, paddingHorizontal: 75, gap: 16 },
  msgWrap: { gap: 12 },
  qCardWrap: { paddingLeft: 0 },

  topActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuDotBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dots: { fontSize: 22, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginTop: -10 },

  inputWrap: { paddingHorizontal: 75, paddingBottom: 24, paddingTop: 10 },

  // Close-chat prompt — clear question + explicit, colour-coded actions (Item D).
  endPrompt: {
    marginHorizontal: 75,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFCF8',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  endQuestion: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 30, color: colors.textPrimary },
  endActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  endBtn: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  // Safe: keep chatting = green
  endKeep: { backgroundColor: 'rgba(42,242,139,0.20)', borderColor: '#1E9E5A' },
  endKeepText: { fontFamily: fonts.heading, fontSize: 22, color: '#1E9E5A' },
  // Destructive: close chat = red
  endClose: { backgroundColor: 'rgba(244,88,88,0.14)', borderColor: colors.feedbackRed },
  endCloseText: { fontFamily: fonts.heading, fontSize: 22, color: colors.feedbackRed },
});
