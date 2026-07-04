import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { sendGreeting, sendStudentMessage, setShowEndModal, clearCurrentChat } from '../../../firebase/session';
import { useReadAloud } from '../../../hooks/useReadAloud';
import { useLanguage } from '../../../context/LanguageContext';
import ChatBubble from '../components/ChatBubble';
import ThinkingDots from '../components/ThinkingDots';
import ChatInputBar from '../components/ChatInputBar';
import WorkbookQuestionCard from '../components/WorkbookQuestionCard';
import TopBar from '../components/TopBar';
import { ChatOptionsMenu, RenameModal, DeleteModal } from '../components/overlays';
import { ReadAloudPill } from '../../../components/icons';
import { logTap } from '../../../lib/autolog';
import { colors, fonts } from '../../../theme';
import type { MessageType, StudentMessageType, Session, Subject } from '../../../types/session';

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

  const [chatName, setChatName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [deletingOpen, setDeletingOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const messages = session?.chatHistory
    ? Object.values(session.chatHistory).sort((a, b) => a.timestamp - b.timestamp)
    : [];

  const { enabled: readAloud, toggle: toggleReadAloud, speak } = useReadAloud(messages, session?.language ?? 'en');

  useEffect(() => {
    if (greetedRef.current || !session) return;
    greetedRef.current = true;
    if (!session.chatHistory) {
      const greeting = session.greetings[subject];
      if (greeting) sendGreeting(roomCode, greeting, session.greetingsReadAloud?.[subject]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleSend(payload: { text: string; type: StudentMessageType; photoURL?: string; voiceTranscript?: string }) {
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

  const rightSlot = (
    <View style={styles.topActions}>
      <Pressable onPress={() => { logTap('student:read-aloud'); toggleReadAloud(); }} accessibilityLabel="Toggle read aloud">
        <ReadAloudPill label={t('read_aloud')} active={readAloud} />
      </Pressable>
      <Pressable style={styles.menuDotBtn} onPress={() => { logTap('student:chat-menu'); setMenuOpen(true); }} hitSlop={8} accessibilityLabel="Chat options">
        <Text style={styles.dots}>···</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.page}>
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
              readAloudText={msg.readAloudText}
              onSpeak={msg.role === 'ai' ? () => speak(msg.readAloudText ?? msg.text) : undefined}
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
          <View style={styles.endLabel}><Text style={styles.endLabelText}>Close Chat?</Text></View>
          <Pressable style={styles.endYes} onPress={async () => { logTap('student:close-chat-yes'); await setShowEndModal(roomCode, false); onCloseChat(chatName || undefined); }}>
            <Text style={styles.endBtnText}>Yes</Text>
          </Pressable>
          <Pressable style={styles.endNo} onPress={() => { logTap('student:close-chat-no'); setShowEndModal(roomCode, false); }}>
            <Text style={styles.endBtnText}>No</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.inputWrap}>
        <ChatInputBar
          roomCode={roomCode}
          initialMode={inputMode}
          onSend={handleSend}
          onInputFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
        />
      </View>

      {menuOpen ? (
        <ChatOptionsMenu
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
    </View>
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

  inputWrap: { paddingHorizontal: 75, paddingBottom: 24 },

  endPrompt: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 75, paddingBottom: 12 },
  endLabel: { borderWidth: 2, borderColor: '#F5A623', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 20 },
  endLabelText: { fontFamily: fonts.heading, fontSize: 22, color: '#F5A623' },
  endYes: { backgroundColor: '#B8F0C8', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 28 },
  endNo: { backgroundColor: '#FADADD', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 28 },
  endBtnText: { fontFamily: fonts.heading, fontSize: 22, color: colors.textPrimary },
});
