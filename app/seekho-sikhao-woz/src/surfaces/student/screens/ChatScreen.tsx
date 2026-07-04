import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sendGreeting, sendStudentMessage, setWorkbookActive, setShowEndModal, clearCurrentChat } from '../../../firebase/session';
import { useReadAloud } from '../../../hooks/useReadAloud';
import ChatBubble from '../components/ChatBubble';
import ThinkingDots from '../components/ThinkingDots';
import ChatInputBar from '../components/ChatInputBar';
import WorkbookQuestionCard from '../components/WorkbookQuestionCard';
import TopBar from '../components/TopBar';
import styles from './ChatScreen.module.css';
import type { MessageType, StudentMessageType, Session, Subject } from '../../../types/session';

interface Props {
  roomCode: string;
  subject: Subject;
  inputMode: MessageType;
  session: Session | null;
  onBack: (chatName?: string) => void;
  onCloseChat: (chatName?: string) => void;
  onDeleteChat: () => void;
  log?: (label: string) => void;
}

export default function ChatScreen({ roomCode, subject, inputMode, session, onBack, onCloseChat, onDeleteChat, log }: Props) {
  const bottomRef  = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  const [chatName,     setChatName]     = useState('');
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [deletingOpen, setDeletingOpen] = useState(false);
  const [renameValue,  setRenameValue]  = useState('');
  const [deleteBusy,   setDeleteBusy]   = useState(false);

  const messages = session?.chatHistory
    ? Object.values(session.chatHistory).sort((a, b) => a.timestamp - b.timestamp)
    : [];

  const { enabled: readAloud, toggle: toggleReadAloud, loading: ttsLoading, speak } = useReadAloud(messages, session?.language ?? 'en');

  useEffect(() => {
    if (greetedRef.current) return;
    if (!session) return;
    greetedRef.current = true;
    if (!session.chatHistory) {
      const greeting = session.greetings[subject];
      if (greeting) sendGreeting(roomCode, greeting, session.greetingsReadAloud?.[subject]);
    }
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, session?.showThinking]);

  const prevShowThinking = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (prevShowThinking.current === true && session?.showThinking === false) {
      log?.('ai_response_received');
    }
    prevShowThinking.current = session?.showThinking;
  }, [session?.showThinking]);

  async function handleSend(payload: { text: string; type: StudentMessageType; photoURL?: string; voiceTranscript?: string }) {
    log?.('ai_message_sent');
    await sendStudentMessage(roomCode, payload);
  }

  function openRename() {
    setMenuOpen(false);
    setRenameValue(chatName);
    setRenamingOpen(true);
  }

  function openDelete() {
    setMenuOpen(false);
    setDeletingOpen(true);
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
    <div className={styles.topActions}>
      <button
        className={`${styles.readAloudBtn} ${ttsLoading ? styles.readAloudLoading : ''}`}
        onClick={toggleReadAloud}
        aria-label="Toggle read aloud"
        data-log="student:read-aloud-toggle"
      >
        <img
          src={readAloud ? '/icons/read-aloud-on.svg' : '/icons/read-aloud-off.svg'}
          alt=""
          className={styles.readAloudIcon}
        />
      </button>
      <button
        className={styles.menuDotBtn}
        onClick={() => setMenuOpen(true)}
        aria-label="Chat options"
        data-log="student:chat-menu"
      >
        ···
      </button>
    </div>
  );

  return (
    <div className={styles.page}>
      <TopBar
        title={subject}
        showBack
        onBack={() => onBack(chatName || undefined)}
        rightSlot={rightSlot}
      />

      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <div key={msg.id ?? i}>
            <ChatBubble
              role={msg.role}
              text={msg.text}
              type={msg.type}
              photoURL={msg.photoURL}
              workbookCorrect={msg.workbookCorrect}
              readAloudText={msg.readAloudText}
              onSpeak={msg.role === 'ai' ? () => speak(msg.readAloudText ?? msg.text) : undefined}
            />
            {msg.workbookQuestion && (
              <WorkbookQuestionCard
                question={msg.workbookQuestion}
                onTry={() => setWorkbookActive(roomCode, true)}
              />
            )}
          </div>
        ))}
        {session?.showThinking && <ThinkingDots />}
        <div ref={bottomRef} />
      </div>

      {session?.showEndModal && (
        <div className={styles.endPrompt}>
          <span className={styles.endLabel}>Close Chat?</span>
          <button className={styles.endYes} data-log="student:close-chat-yes" onClick={async () => { await setShowEndModal(roomCode, false); onCloseChat(chatName || undefined); }}>Yes</button>
          <button className={styles.endNo}  data-log="student:close-chat-no" onClick={() => setShowEndModal(roomCode, false)}>No</button>
        </div>
      )}

      <div className={styles.inputWrap}>
        <ChatInputBar
          roomCode={roomCode}
          initialMode={inputMode}
          onSend={handleSend}
          onInputFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)}
        />
      </div>

      {/* Three-dot menu */}
      {menuOpen && createPortal(
        <div className={styles.overlayBackdrop} onClick={() => setMenuOpen(false)}>
          <div className={styles.menuCard} onClick={e => e.stopPropagation()}>
            <button className={styles.menuItem} onClick={openRename}>
              <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>Rename Chat</span>
            </button>
            <div className={styles.menuDivider} />
            <button className={`${styles.menuItem} ${styles.menuItemDelete}`} onClick={openDelete}>
              <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              <span>Delete Chat</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Rename modal */}
      {renamingOpen && createPortal(
        <div className={styles.overlayBackdrop} onClick={() => setRenamingOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setRenamingOpen(false)} aria-label="Close">✕</button>
            <h2 className={styles.modalTitle}>Rename Chat</h2>
            <input
              className={styles.modalInput}
              placeholder="Enter chat name…"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && renameValue.trim()) { setChatName(renameValue.trim()); setRenamingOpen(false); } }}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setRenamingOpen(false)}>Cancel</button>
              <button
                className={styles.modalConfirm}
                disabled={!renameValue.trim()}
                onClick={() => { setChatName(renameValue.trim()); setRenamingOpen(false); }}
              >Save</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation modal */}
      {deletingOpen && createPortal(
        <div className={styles.overlayBackdrop} onClick={() => setDeletingOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setDeletingOpen(false)} aria-label="Close">✕</button>
            <h2 className={styles.modalTitle}>Delete Chat</h2>
            <p className={styles.modalBody}>Are you sure you want to<br />delete this chat?</p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setDeletingOpen(false)}>Cancel</button>
              <button className={`${styles.modalConfirm} ${styles.modalDelete}`} onClick={handleDelete} disabled={deleteBusy}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
