import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSession } from '../../hooks/useSession';
import { useLanguage } from '../../context/LanguageContext';
import { firebaseEnabled } from '../../firebase/config';
import { archiveCurrentChat, clearCurrentChat, resumePastChat, setWorkbookActive, setShowEndModal } from '../../firebase/session';
import { logEvent } from '../../firebase/admin';
import LoginScreen from './screens/LoginScreen';
import SubjectScreen from './screens/SubjectScreen';
import InputModeScreen from './screens/InputModeScreen';
import ChatScreen from './screens/ChatScreen';
import WorkbookScreen from './screens/WorkbookScreen';
import EndSessionModal from './components/EndSessionModal';
import { colors, fonts } from '../../theme';
import type { MessageType, Subject, PastChat } from '../../types/session';

type Screen = 'login' | 'subjects' | 'inputMode' | 'chat' | 'workbook';

interface Props {
  roomCode: string;
  onExit: () => void;
}

export default function StudentApp({ roomCode, onExit }: Props) {
  const { session, loading } = useSession(roomCode);
  const { setLanguage } = useLanguage();

  const [screen, setScreen] = useState<Screen>('login');
  const [inputMode, setInputMode] = useState<MessageType>('text');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [studentName, setStudentName] = useState('');
  const [localLogout, setLocalLogout] = useState(false);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const archivingRef = useRef(false);

  function log(label: string) {
    const s = sessionRef.current;
    logEvent(roomCode, label, 'student_app', {
      sessionStartTime: s?.adminControl?.sessionStartTime,
      activeTask: s?.adminControl?.activeTask,
      studentName: s?.adminControl?.studentName,
      grade: s?.adminControl?.grade,
    });
  }

  useEffect(() => {
    if (session?.language) setLanguage(session.language);
  }, [session?.language, setLanguage]);

  // Wizard-driven workbook open/close (real Firebase). In demo the ChatScreen
  // "Try this question" button opens the workbook locally (see onOpenWorkbook).
  useEffect(() => {
    if (session?.workbookState.active && screen !== 'workbook') setScreen('workbook');
    if (!session?.workbookState.active && screen === 'workbook') setScreen('chat');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.workbookState.active]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Connecting…</Text>
      </View>
    );
  }

  const pastChats = session?.pastChats
    ? Object.values(session.pastChats).sort((a, b) => b.endedAt - a.endedAt)
    : [];

  async function handleChatBack(chatName?: string) {
    if (session?.chatHistory && !archivingRef.current) {
      archivingRef.current = true;
      await archiveCurrentChat(roomCode, chatName);
      archivingRef.current = false;
    }
    setScreen('inputMode');
  }

  async function handleDeleteChat() {
    await clearCurrentChat(roomCode);
    setScreen('inputMode');
  }

  async function handleViewPastChat(chat: PastChat) {
    await resumePastChat(roomCode, chat.id);
    setScreen('chat');
  }

  function requestLogout() {
    setLocalLogout(true);
    setShowEndModal(roomCode, true);
  }

  function openWorkbook() {
    setWorkbookActive(roomCode, true);
    if (!firebaseEnabled) setScreen('workbook'); // demo: session won't update
  }

  const showLogout = (localLogout || !!session?.showEndModal) && screen !== 'chat' && screen !== 'workbook';

  return (
    <View style={styles.root}>
      {screen === 'login' && (
        <LoginScreen onLogin={(name) => { setStudentName(name); log('screen:login_complete'); setScreen('subjects'); }} />
      )}

      {screen === 'subjects' && (
        <SubjectScreen
          roomCode={roomCode}
          studentName={studentName}
          onLogout={requestLogout}
          onSelect={async (s) => {
            if (session?.chatHistory && !archivingRef.current) {
              archivingRef.current = true;
              await archiveCurrentChat(roomCode);
              archivingRef.current = false;
            }
            setSubject(s);
            log(`screen:subject_selected:${s}`);
            setScreen('inputMode');
          }}
        />
      )}

      {screen === 'inputMode' && subject && (
        <InputModeScreen
          subject={subject}
          roomCode={roomCode}
          pastChats={pastChats}
          onSelect={(mode) => { setInputMode(mode); setScreen('chat'); log('screen:chat'); }}
          onBack={() => setScreen('subjects')}
          onViewPastChat={async (chat) => { log('past_chat_opened'); await handleViewPastChat(chat); }}
          log={log}
        />
      )}

      {screen === 'chat' && subject && (
        <ChatScreen
          roomCode={roomCode}
          subject={subject}
          inputMode={inputMode}
          session={session}
          onBack={handleChatBack}
          onOpenWorkbook={openWorkbook}
          log={log}
          onDeleteChat={handleDeleteChat}
          onCloseChat={async (chatName?: string) => {
            if (session?.chatHistory && !archivingRef.current) {
              archivingRef.current = true;
              await archiveCurrentChat(roomCode, chatName);
              archivingRef.current = false;
            }
            setScreen('subjects');
          }}
        />
      )}

      {screen === 'workbook' && subject && (
        <WorkbookScreen
          roomCode={roomCode}
          subject={subject}
          session={session}
          inputMode={inputMode}
          onBack={() => setScreen('chat')}
          log={log}
        />
      )}

      {showLogout && (
        <EndSessionModal
          roomCode={roomCode}
          onLoggedOut={() => { setLocalLogout(false); onExit(); }}
          onCancel={() => setLocalLogout(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg1 },
  loading: { flex: 1, backgroundColor: colors.bg1, padding: 32 },
  loadingText: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary },
});
