import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Image, Animated, Easing, StyleSheet } from 'react-native';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { uploadPhoto } from '../../../firebase/storage';
import { useLanguage } from '../../../context/LanguageContext';
import CameraScreen from './CameraScreen';
import { MicIcon, CameraIcon, SendCircle, Trash } from '../../../components/icons';
import { colors, fonts } from '../../../theme';
import type { MessageType, StudentMessageType } from '../../../types/session';

const BAR_COUNT = 36;
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const t = i / (BAR_COUNT - 1);
  return Math.round(8 + 32 * Math.abs(Math.sin(t * Math.PI * 4.2 + 0.8)));
});

function formatTime(secs: number) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function WaveBars() {
  const vals = useRef(BAR_HEIGHTS.map(() => new Animated.Value(1))).current;
  useEffect(() => {
    const loops = vals.map((v, i) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 0.2, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      const t = setTimeout(() => anim.start(), (i * 42) % 560);
      return { anim, t };
    });
    return () => loops.forEach(({ anim, t }) => { clearTimeout(t); anim.stop(); });
  }, [vals]);

  return (
    <View style={styles.waveBars}>
      {BAR_HEIGHTS.map((h, i) => (
        <Animated.View key={i} style={[styles.waveBar, { height: h, transform: [{ scaleY: vals[i] }] }]} />
      ))}
    </View>
  );
}

interface Props {
  roomCode: string;
  initialMode?: MessageType;
  onSend: (payload: { text: string; type: StudentMessageType; photoURL?: string; voiceTranscript?: string }) => void;
  onInputFocus?: () => void;
}

export default function ChatInputBar({ roomCode, initialMode, onSend, onInputFocus }: Props) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showCamera, setShowCamera] = useState(initialMode === 'photo');
  const { state: srState, transcript, interim, start, stop, reset } = useSpeechRecognition();

  useEffect(() => {
    if (initialMode === 'voice') start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isListening = srState === 'listening';
  const hasTranscript = srState === 'done' && !!transcript;

  useEffect(() => {
    if (!isListening) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isListening]);

  function handleSend() {
    if (busy) return;
    if (text.trim()) {
      onSend({ text: text.trim(), type: 'text' });
      setText('');
    } else if (hasTranscript) {
      onSend({ text: transcript, type: 'voice', voiceTranscript: transcript });
      reset();
    }
  }

  function handleVoiceSend() {
    // No on-device STT in Expo Go — send an (empty-transcript) voice message so
    // the WoZ flow proceeds; the wizard supplies the reply. See useSpeechRecognition.
    const textToSend = transcript || interim || '';
    stop();
    onSend({ text: textToSend, type: 'voice', voiceTranscript: textToSend });
    reset();
  }

  async function processPhoto(uri: string) {
    setPendingPhoto(uri);
    setBusy(true);
    try {
      const url = await uploadPhoto(roomCode, uri);
      onSend({ text: '', type: 'photo', photoURL: url });
    } finally {
      setBusy(false);
      setPendingPhoto(null);
    }
  }

  return (
    <View style={styles.bar}>
      {pendingPhoto ? (
        <View style={styles.pendingWrap}>
          <Image source={{ uri: pendingPhoto }} style={styles.pendingImg} />
          <View style={styles.pendingOverlay}>
            <Text style={styles.pendingLabel}>{t('sending')}</Text>
          </View>
        </View>
      ) : null}

      {isListening ? (
        <View style={styles.waveformCard}>
          <View style={styles.waveformTop}>
            <WaveBars />
            <Text style={styles.waveTimer}>{formatTime(elapsed)}</Text>
          </View>
          <View style={styles.waveActions}>
            <Pressable style={styles.waveDeleteBtn} onPress={() => { stop(); reset(); }} accessibilityLabel="Cancel recording">
              <Trash width={22} height={22} color={colors.feedbackRed} />
            </Pressable>
            <Pressable onPress={handleVoiceSend} accessibilityLabel="Send voice">
              <SendCircle size={52} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {hasTranscript ? (
        <View style={styles.inputArea}>
          <Text style={styles.voiceDisplay}>{transcript}</Text>
        </View>
      ) : null}

      {!isListening && !hasTranscript ? (
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder={t('chat_placeholder')}
            placeholderTextColor={colors.textMuted2}
            value={text}
            onChangeText={setText}
            onFocus={onInputFocus}
            multiline
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={handleSend}
          />
        </View>
      ) : null}

      {!isListening ? (
        <View style={styles.actions}>
          <View style={styles.leftIcons}>
            <Pressable style={styles.iconBtn} onPress={() => start()} accessibilityLabel="Voice input">
              <MicIcon width={26} height={32} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => setShowCamera(true)} disabled={busy} accessibilityLabel="Camera">
              <CameraIcon width={44} height={44} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Pressable onPress={handleSend} disabled={!text.trim() && !hasTranscript} style={[(!text.trim() && !hasTranscript) && styles.sendDisabled]} accessibilityLabel="Send">
            <SendCircle size={52} />
          </Pressable>
        </View>
      ) : null}

      {showCamera ? (
        <CameraScreen
          onCapture={(uri) => { setShowCamera(false); processPhoto(uri); }}
          onClose={() => setShowCamera(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'rgba(42, 242, 139, 0.15)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  inputArea: { minHeight: 44, justifyContent: 'center' },
  textInput: { fontFamily: fonts.body, fontSize: 40, lineHeight: 40, color: colors.textPrimary, padding: 0, minHeight: 44 },
  voiceDisplay: { fontFamily: fonts.body, fontSize: 40, lineHeight: 40, color: colors.textPrimary },

  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftIcons: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingLeft: 6 },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },

  waveformCard: { gap: 12 },
  waveformTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waveBars: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 48 },
  waveBar: { width: 3, backgroundColor: colors.textPrimary, borderRadius: 2 },
  waveTimer: { fontFamily: fonts.body, fontSize: 28, lineHeight: 28, color: colors.textPrimary, minWidth: 52, textAlign: 'right' },
  waveActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waveDeleteBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(244, 88, 88, 0.12)', alignItems: 'center', justifyContent: 'center' },

  pendingWrap: { alignSelf: 'flex-end', width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  pendingImg: { width: '100%', height: '100%', opacity: 0.6 },
  pendingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  pendingLabel: { fontFamily: fonts.body, fontSize: 20, color: '#FFFFFF' },
});
