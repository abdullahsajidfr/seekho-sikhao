import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { endSession, setShowEndModal } from '../../../firebase/session';
import { logTap } from '../../../lib/autolog';
import { useLanguage } from '../../../context/LanguageContext';
import { colors, fonts } from '../../../theme';

interface Props {
  roomCode: string;
  onLoggedOut: () => void;
  onCancel?: () => void;
}

export default function EndSessionModal({ roomCode, onLoggedOut, onCancel }: Props) {
  const { t } = useLanguage();

  async function handleLogOut() {
    logTap('student:end-session-confirm');
    await endSession(roomCode);
    onLoggedOut();
  }

  async function handleCancel() {
    logTap('student:end-session-cancel');
    await setShowEndModal(roomCode, false);
    onCancel?.();
  }

  return (
    <Modal transparent visible animationType="fade" supportedOrientations={['landscape', 'landscape-left', 'landscape-right']} onRequestClose={handleCancel}>
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Pressable style={styles.close} onPress={handleCancel} hitSlop={8}><Text style={styles.closeX}>✕</Text></Pressable>
          <Text style={styles.text}>{t('end_text')}</Text>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.cancel]} onPress={handleCancel}><Text style={styles.btnText}>{t('end_no')}</Text></Pressable>
            <Pressable style={[styles.btn, styles.logout]} onPress={handleLogOut}><Text style={styles.btnText}>{t('end_yes')}</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modal: {
    backgroundColor: '#FFFCF8',
    borderRadius: 24,
    paddingTop: 44,
    paddingBottom: 32,
    paddingHorizontal: 40,
    width: 360,
    alignItems: 'center',
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
    elevation: 16,
  },
  close: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 18, color: colors.textMuted },
  text: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 27, color: colors.textPrimary, textAlign: 'center', maxWidth: 280 },
  actions: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  btn: { minWidth: 116, height: 46, paddingHorizontal: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.heading, fontSize: 17, color: colors.textPrimary },
  cancel: { backgroundColor: 'rgba(42, 186, 242, 0.28)' },
  logout: { backgroundColor: '#FADADD' },
});
