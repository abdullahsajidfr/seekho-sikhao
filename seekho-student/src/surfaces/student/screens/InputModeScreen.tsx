import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import TopBar from '../components/TopBar';
import { ChatOptionsMenu, RenameModal, DeleteModal, type Anchor } from '../components/overlays';
import { TypeSquare, MicSquare, CameraSquare } from '../../../components/icons';
import { renamePastChat, deletePastChat } from '../../../firebase/session';
import { logTap } from '../../../lib/autolog';
import { colors, fonts } from '../../../theme';
import type { MessageType, Subject, PastChat } from '../../../types/session';

const MODES: { mode: MessageType; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { mode: 'text', label: 'Type', Icon: TypeSquare },
  { mode: 'voice', label: 'Speak', Icon: MicSquare },
  { mode: 'photo', label: 'Photo', Icon: CameraSquare },
];

function relativeTime(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return 'last week';
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
  const [menuChat, setMenuChat] = useState<PastChat | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<Anchor | undefined>(undefined);
  const [renamingChat, setRenamingChat] = useState<PastChat | null>(null);
  const [deletingChat, setDeletingChat] = useState<PastChat | null>(null);
  const [busy, setBusy] = useState(false);

  // Per-row refs for the ··· buttons so the options menu can drop down directly
  // under the button that was tapped instead of centering on screen.
  const menuBtnRefs = useRef<Map<string, View>>(new Map());
  function openMenu(chat: PastChat) {
    const btn = menuBtnRefs.current.get(chat.id);
    if (!btn) { setMenuAnchor(undefined); setMenuChat(chat); return; }
    btn.measureInWindow((x, y, w, h) => {
      const sw = Dimensions.get('window').width;
      setMenuAnchor({ top: y + h + 8, right: Math.max(12, sw - (x + w)) });
      setMenuChat(chat);
    });
  }

  useEffect(() => {
    if (pastChats.length > 0) log?.('screen:past_chats');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRename(name: string) {
    if (!roomCode || !renamingChat || !name.trim() || busy) return;
    setBusy(true);
    await renamePastChat(roomCode, renamingChat.id, name.trim());
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
    <View style={styles.page}>
      <TopBar title="Home" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Ask a question</Text>

        <View style={styles.modes}>
          {MODES.map(({ mode, label, Icon }) => (
            <Pressable key={mode} style={({ pressed }) => [styles.modeBtn, pressed && styles.pressed]} onPress={() => { logTap(`student:input-mode-${mode}`); log?.(`input_mode:${mode}`); onSelect(mode); }}>
              <Icon size={53} />
              <Text style={styles.modeLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {pastChats.length > 0 ? (
          <View style={styles.pastSection}>
            <Text style={styles.pastHeading}>Past Questions</Text>
            <View style={styles.pastList}>
              {pastChats.map((chat) => (
                <View key={chat.id} style={styles.pastRow}>
                  <Pressable style={styles.pastItem} onPress={() => { logTap('student:past-chat'); onViewPastChat?.(chat); }}>
                    <Text style={styles.pastQuestion} numberOfLines={1}>{chat.firstQuestion}</Text>
                  </Pressable>
                  <Text style={styles.pastTime}>{relativeTime(chat.endedAt)}</Text>
                  <Pressable
                    ref={(el) => { if (el) menuBtnRefs.current.set(chat.id, el as unknown as View); else menuBtnRefs.current.delete(chat.id); }}
                    style={styles.pastMenuBtn}
                    onPress={() => openMenu(chat)}
                    hitSlop={8}
                    accessibilityLabel="Chat options"
                  >
                    <Text style={styles.dots}>···</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {menuChat ? (
        <ChatOptionsMenu
          anchor={menuAnchor}
          onClose={() => setMenuChat(null)}
          onRename={() => { setRenamingChat(menuChat); setMenuChat(null); }}
          onDelete={() => { setDeletingChat(menuChat); setMenuChat(null); }}
        />
      ) : null}

      {renamingChat ? (
        <RenameModal initial={renamingChat.firstQuestion} onCancel={() => setRenamingChat(null)} onSave={handleRename} />
      ) : null}

      {deletingChat ? (
        <DeleteModal busy={busy} onCancel={() => setDeletingChat(null)} onDelete={handleDelete} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg1 },
  body: { alignItems: 'center', gap: 44, paddingHorizontal: 32, paddingTop: 36, paddingBottom: 32 },
  heading: { fontFamily: fonts.heading, fontSize: 52, lineHeight: 62, color: colors.textPrimary, textAlign: 'center' },
  modes: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 840, marginTop: 8 },
  modeBtn: {
    width: 216,
    height: 132,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pressed: { opacity: 0.8 },
  modeLabel: { fontFamily: fonts.heading, fontSize: 19, color: colors.textPrimary },

  pastSection: { width: '100%', maxWidth: 840, gap: 16, marginTop: 4 },
  pastHeading: { fontFamily: fonts.heading, fontSize: 28, color: colors.textPrimary },
  pastList: { gap: 12 },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pastItem: { flex: 1, paddingVertical: 16, paddingLeft: 24, paddingRight: 12 },
  pastQuestion: { fontFamily: fonts.headingRegular, fontSize: 20, color: colors.textPrimary },
  pastTime: { fontFamily: fonts.heading, fontSize: 16, color: colors.textMuted2, marginLeft: 16, marginRight: 6 },
  pastMenuBtn: { width: 40, height: 40, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  dots: { fontSize: 22, fontWeight: '700', color: '#B4B4B4', letterSpacing: 1, marginTop: -8 },
});
