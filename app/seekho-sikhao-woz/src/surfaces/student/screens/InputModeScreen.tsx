import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import TopBar from '../components/TopBar';
import { renamePastChat, deletePastChat } from '../../../firebase/session';
import styles from './InputModeScreen.module.css';
import type { MessageType, Subject, PastChat } from '../../../types/session';

const MODES = [
  { mode: 'text'  as MessageType, label: 'Type',  icon: '/icons/type-square.svg' },
  { mode: 'voice' as MessageType, label: 'Speak', icon: '/icons/mic-square.svg' },
  { mode: 'photo' as MessageType, label: 'Photo', icon: '/icons/camera-square.svg' },
];

function relativeTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : 'earlier';
}

interface Props {
  subject?: Subject;
  roomCode?: string;
  pastChats?: PastChat[];
  onSelect: (mode: MessageType) => void;
  onBack: () => void;
  onViewPastChat?: (chat: PastChat) => void;
  log?: (label: string) => void;
}

export default function InputModeScreen({ roomCode, pastChats = [], onSelect, onBack, onViewPastChat, log }: Props) {
  const [menuChat,    setMenuChat]    = useState<PastChat | null>(null);
  const [renamingChat, setRenamingChat] = useState<PastChat | null>(null);
  const [deletingChat, setDeletingChat] = useState<PastChat | null>(null);
  const [renameValue,  setRenameValue]  = useState('');
  const [busy,         setBusy]         = useState(false);

  useEffect(() => {
    if (pastChats.length > 0) log?.('screen:past_chats');
  }, []); // fires once on mount

  function openMenu(e: React.MouseEvent, chat: PastChat) {
    e.stopPropagation();
    setMenuChat(chat);
  }

  function openRename(chat: PastChat) {
    setMenuChat(null);
    setRenamingChat(chat);
    setRenameValue(chat.firstQuestion);
  }

  function openDelete(chat: PastChat) {
    setMenuChat(null);
    setDeletingChat(chat);
  }

  async function handleRename() {
    if (!roomCode || !renamingChat || !renameValue.trim() || busy) return;
    setBusy(true);
    await renamePastChat(roomCode, renamingChat.id, renameValue.trim());
    setBusy(false);
    setRenamingChat(null);
  }

  async function handleDelete() {
    if (!roomCode || !deletingChat || busy) return;
    setBusy(true);
    await deletePastChat(roomCode, deletingChat.id);
    log?.('chat_deleted');
    setBusy(false);
    setDeletingChat(null);
  }

  return (
    <div className={styles.page}>
      <TopBar title="Home" showBack onBack={onBack} />

      <div className={styles.body}>
        <h1 className={styles.heading}>Ask a question</h1>

        <div className={styles.modes}>
          {MODES.map(({ mode, label, icon }) => (
            <button key={mode} className={styles.modeBtn} data-log={`student:input-mode-${mode}`} onClick={() => { log?.(`input_mode:${mode}`); onSelect(mode); }}>
              <img src={icon} alt={label} className={styles.modeIcon} />
              <span className={styles.modeLabel}>{label}</span>
            </button>
          ))}
        </div>

        {pastChats.length > 0 && (
          <div className={styles.pastSection}>
            <h2 className={styles.pastHeading}>Past Questions</h2>
            <div className={styles.pastList}>
              {pastChats.map(chat => (
                <div key={chat.id} className={styles.pastRow}>
                  <button className={styles.pastItem} onClick={() => onViewPastChat?.(chat)}>
                    <span className={styles.pastQuestion}>{chat.firstQuestion}</span>
                  </button>
                  <span className={styles.pastTime}>{relativeTime(chat.endedAt)}</span>
                  <button
                    className={styles.pastMenuBtn}
                    onClick={e => openMenu(e, chat)}
                    aria-label="Chat options"
                  >
                    ···
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu overlay */}
      {menuChat && createPortal(
        <div className={styles.overlayBackdrop} onClick={() => setMenuChat(null)}>
          <div className={styles.menuCard} onClick={e => e.stopPropagation()}>
            <button className={styles.menuItem} onClick={() => openRename(menuChat)}>
              <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>Rename Chat</span>
            </button>
            <div className={styles.menuDivider} />
            <button className={`${styles.menuItem} ${styles.menuItemDelete}`} onClick={() => openDelete(menuChat)}>
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
      {renamingChat && createPortal(
        <div className={styles.overlayBackdrop} onClick={() => setRenamingChat(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setRenamingChat(null)} aria-label="Close">✕</button>
            <h2 className={styles.modalTitle}>Rename Chat</h2>
            <input
              className={styles.modalInput}
              placeholder="Enter new name…"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setRenamingChat(null)}>Cancel</button>
              <button className={styles.modalConfirm} onClick={handleRename} disabled={!renameValue.trim() || busy}>Save</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation modal */}
      {deletingChat && createPortal(
        <div className={styles.overlayBackdrop} onClick={() => setDeletingChat(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setDeletingChat(null)} aria-label="Close">✕</button>
            <h2 className={styles.modalTitle}>Delete Chat</h2>
            <p className={styles.modalBody}>Are you sure you want to<br />delete this chat?</p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setDeletingChat(null)}>Cancel</button>
              <button className={`${styles.modalConfirm} ${styles.modalDelete}`} onClick={handleDelete} disabled={busy}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
