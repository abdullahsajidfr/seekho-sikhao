import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, StyleSheet } from 'react-native';
import { RenameIcon, DeleteIcon, LogOutIcon } from '../../../components/icons';
import { logTap } from '../../../lib/autolog';
import { colors, fonts } from '../../../theme';

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 24,
  elevation: 12,
};

function Backdrop({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Modal transparent visible animationType="fade" supportedOrientations={['landscape', 'landscape-left', 'landscape-right']} onRequestClose={onPress}>
      <Pressable style={styles.backdrop} onPress={onPress}>
        <Pressable onPress={(e) => e.stopPropagation()}>{children}</Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Chat options (Rename / Delete) ──────────────────────────────────────
export function ChatOptionsMenu({ onRename, onDelete, onClose }: { onRename: () => void; onDelete: () => void; onClose: () => void }) {
  return (
    <Backdrop onPress={onClose}>
      <View style={[styles.menuCard, shadow]}>
        <Pressable style={styles.menuItem} onPress={() => { logTap('student:chat-rename'); onRename(); }}>
          <RenameIcon size={24} color="#3A3A3A" />
          <Text style={styles.menuText}>Rename Chat</Text>
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable style={styles.menuItem} onPress={() => { logTap('student:chat-delete'); onDelete(); }}>
          <DeleteIcon size={24} color="#3A3A3A" />
          <Text style={styles.menuText}>Delete Chat</Text>
        </Pressable>
      </View>
    </Backdrop>
  );
}

// ── Rename modal ────────────────────────────────────────────────────────
export function RenameModal({ initial, onCancel, onSave }: { initial: string; onCancel: () => void; onSave: (name: string) => void }) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  return (
    <Backdrop onPress={onCancel}>
      <View style={[styles.modal, shadow]}>
        <Pressable style={styles.modalClose} onPress={onCancel} hitSlop={8}><Text style={styles.modalCloseX}>✕</Text></Pressable>
        <Text style={styles.modalTitle}>Rename Chat</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Enter new name…"
          placeholderTextColor={colors.textMuted2}
          value={value}
          onChangeText={setValue}
          autoFocus
          onSubmitEditing={() => value.trim() && onSave(value.trim())}
        />
        <View style={styles.modalActions}>
          <Pressable style={[styles.pill, styles.pillCancel]} onPress={onCancel}><Text style={styles.pillCancelText}>Cancel</Text></Pressable>
          <Pressable style={[styles.pill, styles.pillConfirm, !value.trim() && styles.pillDisabled]} disabled={!value.trim()} onPress={() => { logTap('student:chat-rename-save'); onSave(value.trim()); }}>
            <Text style={styles.pillConfirmText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Backdrop>
  );
}

// ── Delete confirmation modal ───────────────────────────────────────────
export function DeleteModal({ busy, onCancel, onDelete }: { busy?: boolean; onCancel: () => void; onDelete: () => void }) {
  return (
    <Backdrop onPress={onCancel}>
      <View style={[styles.modal, shadow]}>
        <Pressable style={styles.modalClose} onPress={onCancel} hitSlop={8}><Text style={styles.modalCloseX}>✕</Text></Pressable>
        <Text style={styles.modalTitle}>Delete Chat</Text>
        <Text style={styles.modalBody}>Are you sure you want to{'\n'}delete this chat?</Text>
        <View style={styles.modalActions}>
          <Pressable style={[styles.pill, styles.pillCancel]} onPress={onCancel}><Text style={styles.pillCancelText}>Cancel</Text></Pressable>
          <Pressable style={[styles.pill, styles.pillDelete, busy && styles.pillDisabled]} disabled={busy} onPress={() => { logTap('student:chat-delete-confirm'); onDelete(); }}>
            <Text style={styles.pillDeleteText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </Backdrop>
  );
}

// ── Settings menu (Log Out) ─────────────────────────────────────────────
export function SettingsMenu({ onLogOut, onClose }: { onLogOut: () => void; onClose: () => void }) {
  return (
    <Backdrop onPress={onClose}>
      <View style={[styles.settingsCard, shadow]}>
        <Pressable style={styles.settingsItem} onPress={() => { logTap('student:logout'); onLogOut(); }}>
          <LogOutIcon size={26} color="#3A3A3A" />
          <Text style={styles.settingsText}>Log Out</Text>
        </Pressable>
      </View>
    </Backdrop>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },

  menuCard: { backgroundColor: '#FFFBF7', borderRadius: 20, paddingVertical: 8, width: 280 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20, paddingHorizontal: 28 },
  menuText: { fontFamily: fonts.heading, fontSize: 20, color: '#3A3A3A' },
  menuDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 12 },

  settingsCard: { backgroundColor: '#FFFBF7', borderRadius: 20, paddingVertical: 8, width: 300 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 22, paddingHorizontal: 32 },
  settingsText: { fontFamily: fonts.heading, fontSize: 22, color: '#3A3A3A' },

  modal: { backgroundColor: '#FFFBF7', borderRadius: 24, paddingTop: 32, paddingBottom: 28, paddingHorizontal: 28, width: 320, gap: 20 },
  modalClose: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalCloseX: { fontSize: 18, color: colors.textMuted2 },
  modalTitle: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary, textAlign: 'center' },
  modalBody: { fontFamily: fonts.heading, fontSize: 17, color: colors.textMuted, textAlign: 'center', lineHeight: 26 },
  modalInput: { height: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 16, fontFamily: fonts.heading, fontSize: 16, backgroundColor: '#FFFFFF', color: colors.textPrimary },
  modalActions: { flexDirection: 'row', gap: 12 },

  pill: { flex: 1, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pillDisabled: { opacity: 0.45 },
  pillCancel: { backgroundColor: 'rgba(42, 186, 242, 0.2)' },
  pillCancelText: { fontFamily: fonts.heading, fontSize: 17, color: '#1A7090' },
  pillConfirm: { backgroundColor: colors.primary },
  pillConfirmText: { fontFamily: fonts.heading, fontSize: 17, color: '#FFFFFF' },
  pillDelete: { backgroundColor: 'rgba(244, 88, 88, 0.2)' },
  pillDeleteText: { fontFamily: fonts.heading, fontSize: 17, color: '#c0392b' },
});
