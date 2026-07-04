import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';
import { useLanguage } from '../../context/LanguageContext';
import { archiveCurrentChat, clearCurrentChat, resumePastChat } from '../../firebase/session';
import { logEvent } from '../../firebase/admin';
import LoginScreen     from './screens/LoginScreen';
import SubjectScreen   from './screens/SubjectScreen';
import InputModeScreen from './screens/InputModeScreen';
import ChatScreen      from './screens/ChatScreen';
import WorkbookScreen  from './screens/WorkbookScreen';
import EndSessionModal from './components/EndSessionModal';
import SmileyometerOverlay from './components/SmileyometerOverlay';
import type { MessageType, Subject, PastChat } from '../../types/session';

type Screen = 'login' | 'subjects' | 'inputMode' | 'chat' | 'workbook';

export default function StudentApp() {
  const navigate  = useNavigate();
  const roomCode  = sessionStorage.getItem('roomCode');
  const { session, loading } = useSession(roomCode);
  const { setLanguage } = useLanguage();

  const [screen,      setScreen]      = useState<Screen>('login');
  const [inputMode,   setInputMode]   = useState<MessageType>('text');
  const [subject,     setSubject]     = useState<Subject | null>(null);
  const [studentName, setStudentName] = useState('');

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const archivingRef = useRef(false);

  function log(label: string) {
    if (!roomCode) return;
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

  const prevShowEndModal = useRef(false);
  useEffect(() => {
    if (session?.showEndModal && !prevShowEndModal.current) {
      log('screen:end_session_modal');
    }
    prevShowEndModal.current = session?.showEndModal ?? false;
  }, [session?.showEndModal]);

  useEffect(() => {
    if (session?.workbookState.active && screen !== 'workbook') {
      log('screen:workbook_open');
      setScreen('workbook');
    }
    if (!session?.workbookState.active && screen === 'workbook') setScreen('chat');
  }, [session?.workbookState.active]);

  if (!roomCode) { navigate('/'); return null; }
  if (loading) return <div style={{ padding: 32, fontFamily: 'Fredoka', fontSize: 24 }}>Connecting…</div>;

  const pastChats = session?.pastChats
    ? Object.values(session.pastChats).sort((a, b) => b.endedAt - a.endedAt)
    : [];

  async function handleChatBack(chatName?: string) {
    if (roomCode && session?.chatHistory && !archivingRef.current) {
      archivingRef.current = true;
      await archiveCurrentChat(roomCode, chatName);
      archivingRef.current = false;
    }
    setScreen('inputMode');
  }

  async function handleDeleteChat() {
    if (roomCode) await clearCurrentChat(roomCode);
    setScreen('inputMode');
  }

  async function handleViewPastChat(chat: PastChat) {
    if (!roomCode) return;
    await resumePastChat(roomCode, chat.id);
    setScreen('chat');
  }

  return (
    <>
      {screen === 'login' && (
        <LoginScreen
          onLogin={(name) => { setStudentName(name); log('screen:login_complete'); setScreen('subjects'); }}
        />
      )}

      {screen === 'subjects' && (
        <SubjectScreen
          roomCode={roomCode}
          studentName={studentName}
          onSelect={async (s) => {
            if (session?.chatHistory && !archivingRef.current) {
              log('subject_switched');
              archivingRef.current = true;
              await archiveCurrentChat(roomCode);
              archivingRef.current = false;
            }
            setSubject(s);
            log(`screen:subject_selected:${s}`);
            setScreen('inputMode');
            log('screen:input_mode');
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
          log={log}
          onDeleteChat={handleDeleteChat}
          onCloseChat={async (chatName?: string) => {
            if (roomCode && session?.chatHistory && !archivingRef.current) {
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

      {session?.showEndModal && roomCode && screen !== 'chat' && screen !== 'workbook' && (
        <EndSessionModal roomCode={roomCode} />
      )}

      {session?.adminControl?.smileyometerQuestion != null && roomCode && (
        <SmileyometerOverlay
          roomCode={roomCode}
          questionNum={session.adminControl.smileyometerQuestion}
          adminControl={session.adminControl}
        />
      )}
    </>
  );
}
