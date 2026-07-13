import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSession } from '../../hooks/useSession';
import { useLanguage } from '../../context/LanguageContext';
import { firebaseEnabled } from '../../firebase/config';
import { archiveCurrentChat, clearCurrentChat, resumePastChat, setWorkbookActive, setShowEndModal } from '../../firebase/session';
import { logEvent } from '../../firebase/admin';
import { useLogContext } from '../../lib/autolog';
import SubjectScreen from './screens/SubjectScreen';
import InputModeScreen from './screens/InputModeScreen';
import ChatScreen from './screens/ChatScreen';
import WorkbookScreen from './screens/WorkbookScreen';
import EndSessionModal from './components/EndSessionModal';
import SmileyometerOverlay from './components/SmileyometerOverlay';
import { colors, fonts } from '../../theme';
import type { MessageType, Subject, PastChat } from '../../types/session';

type Screen = 'subjects' | 'inputMode' | 'chat' | 'workbook';

interface Props {
  roomCode: string;
  studentName: string;
  isNew: boolean;
  onExit: () => void;
}

export default function StudentApp({ roomCode, studentName, isNew, onExit }: Props) {
  const { session, loading } = useSession(roomCode);
  const { setLanguage, t } = useLanguage();

  useLogContext(roomCode, session?.adminControl);

  const [screen, setScreen] = useState<Screen>('subjects');
  const [inputMode, setInputMode] = useState<MessageType>('text');
  const [subject, setSubject] = useState<Subject | null>(null);
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

  // Once the child's question is fully solved — the AI marked an answer correct
  // and attached no further practice — prompt them to close the chat. Otherwise
  // kids keep asking follow-ups in one ever-growing chat, so the whole history is
  // re-sent to the model every turn (needless API cost). Closing archives the
  // chat, so the next question starts with a fresh, empty context. `null` = not
  // yet initialised: the first run marks everything already present as handled so
  // resuming a finished chat doesn't immediately re-prompt.
  const promptedCloseRef = useRef<number | null>(null);
  useEffect(() => {
    const aiMsgs = session?.chatHistory
      ? Object.values(session.chatHistory).filter((m) => m.role === 'ai').sort((a, b) => a.timestamp - b.timestamp)
      : [];
    const lastAi = aiMsgs.at(-1);
    if (promptedCloseRef.current === null) {
      promptedCloseRef.current = lastAi?.timestamp ?? 0;
      return;
    }
    if (!lastAi || !lastAi.isCorrect || lastAi.workbookQuestion) return;
    if (lastAi.timestamp <= promptedCloseRef.current) return;
    promptedCloseRef.current = lastAi.timestamp;
    if (!session?.showEndModal) setShowEndModal(roomCode, true);
  }, [session?.chatHistory, session?.showEndModal, roomCode]);

  // Wizard-driven workbook open/close (real Firebase). In demo the ChatScreen
  // "Try this question" button opens the workbook locally (see onOpenWorkbook).
  useEffect(() => {
    // The workbook is only ever a step WITHIN a chat, so only auto-open it from
    // the chat screen (needs a selected subject). Ignoring the flag elsewhere
    // stops a stale `workbookState.active` (left over from a previous session)
    // from forcing the workbook screen before a subject is picked — which would
    // render nothing (subject is null) and blank the app right after login.
    if (session?.workbookState.active && screen === 'chat' && subject) setScreen('workbook');
    if (!session?.workbookState.active && screen === 'workbook') setScreen('chat');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.workbookState.active]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t('connecting')}</Text>
      </View>
    );
  }

  // Past Questions are scoped to the currently-selected subject — a chat archived
  // under Maths must not surface under English. Chats archived before subjects
  // were tagged (no `subject` field) are only shown when no subject is selected.
  const pastChats = session?.pastChats
    ? Object.values(session.pastChats)
        .filter((c) => (subject ? c.subject === subject : true))
        .sort((a, b) => b.endedAt - a.endedAt)
    : [];

  async function handleChatBack(chatName?: string) {
    // Leaving the chat dismisses any pending close-chat prompt so its shared
    // showEndModal flag can't resurface as a spurious logout modal on Home.
    if (session?.showEndModal) setShowEndModal(roomCode, false);
    if (session?.chatHistory && !archivingRef.current) {
      archivingRef.current = true;
      await archiveCurrentChat(roomCode, chatName);
      archivingRef.current = false;
    }
    setScreen('inputMode');
  }

  async function handleDeleteChat() {
    if (session?.showEndModal) setShowEndModal(roomCode, false);
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

  // Admin-driven Smileyometer feedback prompt (1–6, or null). Captured into a
  // local so TS narrows it to a number for the overlay below.
  const smileyometerQuestion = session?.adminControl?.smileyometerQuestion ?? null;

  return (
    <View style={styles.root}>
      {screen === 'subjects' && (
        <SubjectScreen
          roomCode={roomCode}
          studentName={studentName}
          isNew={isNew}
          suppressOverlays={smileyometerQuestion != null}
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
          onSelect={async (mode) => {
            setInputMode(mode);
            // Type/Speak/Photo always start a FRESH chat: archive whatever chat
            // is open (which clears chatHistory) so the subject greeting fires
            // again for a brand-new conversation. Past Questions still resume via
            // onViewPastChat below. (Item 2)
            if (session?.chatHistory && !archivingRef.current) {
              archivingRef.current = true;
              await archiveCurrentChat(roomCode);
              archivingRef.current = false;
            }
            setScreen('chat');
            log('screen:chat');
          }}
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

      {/* Suppressed (not dismissed — showLogout state persists so the modal
          reappears) while a smileyometer question is active: iOS cannot present
          a second native Modal over one already showing, so the admin-pushed
          survey must be the only persistent Modal mounted or it never appears. */}
      {showLogout && smileyometerQuestion == null && (
        <EndSessionModal
          roomCode={roomCode}
          onLoggedOut={() => { setLocalLogout(false); onExit(); }}
          onCancel={() => setLocalLogout(false)}
        />
      )}

      {/* Floats above every screen — the child must answer before it clears. */}
      {smileyometerQuestion != null && (
        <SmileyometerOverlay
          roomCode={roomCode}
          questionNum={smileyometerQuestion}
          adminControl={session?.adminControl}
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
