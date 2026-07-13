import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Image, Animated, Easing, ActivityIndicator, StyleSheet } from 'react-native';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { logTap, logInput } from '../../../lib/autolog';
import { uploadPhoto } from '../../../firebase/storage';
import { useLanguage } from '../../../context/LanguageContext';
import { urduAwareTextStyle } from '../../../lib/textStyle';
import CameraScreen from './CameraScreen';
import { MicIcon, CameraIcon, SendCircle, Trash } from '../../../components/icons';
import { colors, fonts } from '../../../theme';
import type { MessageType, StudentMessagePayload } from '../../../types/session';

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
  onSend: (payload: StudentMessagePayload) => void;
  onInputFocus?: () => void;
  /** Narrow (workbook) layout — scales the mic/camera/send icons and text down. */
  compact?: boolean;
  /** True while the tutor is speaking (or its clip is loading). Arming the mic
   *  holds until this clears so the recorder never captures the AI's own voice. */
  aiSpeaking?: boolean;
}

export default function ChatInputBar({ roomCode, initialMode, onSend, onInputFocus, compact, aiSpeaking }: Props) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showCamera, setShowCamera] = useState(initialMode === 'photo');
  // The child asked to speak while the tutor was still talking: we hold here and
  // start recording the moment the AI finishes (see the aiSpeaking effect below).
  const [waitingForAi, setWaitingForAi] = useState(false);
  const { state: srState, transcript, audioUri, start, stop, reset } = useSpeechRecognition();

  // Voice provenance for the text currently in the box: when the child dictates,
  // we drop the transcript into the editable input (so they can review/edit) but
  // remember it came from the mic. `voiceClipsRef` accumulates EVERY clip that
  // contributed (a child may dictate twice into one message), and
  // `voiceTranscriptRef` keeps the ORIGINAL dictated words — immutable under
  // editing — so the persisted audio↔transcript pairing stays truthful even if
  // the child rewrites the text before sending. Refs (not state) because they're
  // only read at send time and must not trigger renders.
  const voiceClipsRef = useRef<string[]>([]);
  const voiceTranscriptRef = useRef('');

  // Entering the chat in Speak mode arms the mic. requestMic() waits for the AI to
  // stop talking before it records, so the mount-time aiSpeaking value is enough —
  // the effect below covers the case where the tutor is still speaking now.
  useEffect(() => {
    if (initialMode === 'voice') requestMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arm the mic without ever recording over the tutor. If the AI is speaking, hold
  // (show the waiting pill) and let the effect below start the moment it stops;
  // otherwise start now — only from idle, so we never restart an active clip.
  function requestMic() {
    if (aiSpeaking) {
      setWaitingForAi(true);
    } else if (srState === 'idle') {
      start();
    }
  }

  // The tutor stopped talking while the child was waiting to speak → record now.
  // Only fires for a pending request; a normal AI turn never auto-arms the mic
  // (that would hijack the child into recording after every answer).
  useEffect(() => {
    if (waitingForAi && !aiSpeaking) {
      setWaitingForAi(false);
      if (srState === 'idle') start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSpeaking, waitingForAi, srState]);

  const isListening = srState === 'listening';
  const isTranscribing = srState === 'transcribing';

  // When transcription finishes, drop the child's words into the editable input
  // so they can review/edit before sending; on failure just return to typing.
  useEffect(() => {
    if (srState === 'done') {
      if (transcript) {
        setText((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
        // Accumulate provenance: append this dictation's clip and words so a
        // second dictation adds to (never replaces) the first.
        if (audioUri) voiceClipsRef.current.push(audioUri);
        voiceTranscriptRef.current = voiceTranscriptRef.current
          ? `${voiceTranscriptRef.current} ${transcript}`
          : transcript;
      }
      reset();
    } else if (srState === 'error') {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srState]);

  // Compact icon dimensions (workbook's ~48% panel) vs full-size (chat).
  const micW = compact ? 21 : 30;
  const camW = compact ? 24 : 34;
  const sendSize = compact ? 40 : 52;
  const trashSize = compact ? 18 : 22;

  useEffect(() => {
    if (!isListening) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isListening]);

  // Clearing the box drops voice provenance so a freshly typed question is sent
  // as plain text (and we don't upload a stale clip for it). Editing the words
  // while keeping content preserves the voice origin.
  function handleChangeText(value: string) {
    setText(value);
    if (!value.trim()) {
      voiceClipsRef.current = [];
      voiceTranscriptRef.current = '';
    }
  }

  function handleSend() {
    if (busy) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    logTap('student:send');
    logInput('student:chat-message', trimmed);
    if (voiceTranscriptRef.current) {
      // Voice-originated: `text` is whatever the child edited it into, while
      // voiceTranscript stays the ORIGINAL dictation matching the clips.
      onSend({
        text: trimmed,
        type: 'voice',
        voiceTranscript: voiceTranscriptRef.current,
        audioUris: [...voiceClipsRef.current],
      });
    } else {
      onSend({ text: trimmed, type: 'text' });
    }
    setText('');
    voiceClipsRef.current = [];
    voiceTranscriptRef.current = '';
    setWaitingForAi(false);
  }

  function finishVoice() {
    // Stop recording and transcribe. The transcript is dropped into the editable
    // input (see the 'done' effect) so the child can review/edit before sending.
    logTap('student:voice-stop');
    stop();
  }

  function cancelVoice() {
    logTap('student:voice-cancel');
    reset();
    setWaitingForAi(false);
  }

  async function processPhoto(uri: string) {
    setPendingPhoto(uri);
    setPhotoError(false);
    setBusy(true);
    try {
      const url = await uploadPhoto(roomCode, uri);
      onSend({ text: '', type: 'photo', photoURL: url });
      setPendingPhoto(null);
    } catch (e) {
      // Surface the failure instead of silently dropping the photo, and keep the
      // thumbnail around so the child can tap to retry (Item G).
      console.log('[ChatInputBar] photo upload failed', e);
      setPhotoError(true);
    } finally {
      setBusy(false);
    }
  }

  function dismissPhoto() {
    setPendingPhoto(null);
    setPhotoError(false);
  }

  return (
    <View style={[styles.bar, compact && styles.barCompact]}>
      {pendingPhoto ? (
        <View style={styles.pendingWrap}>
          <Pressable
            style={styles.pendingInner}
            onPress={photoError ? () => processPhoto(pendingPhoto) : undefined}
            accessibilityLabel={photoError ? 'Retry upload' : 'Sending photo'}
          >
            <Image source={{ uri: pendingPhoto }} style={styles.pendingImg} />
            <View style={[styles.pendingOverlay, photoError && styles.pendingOverlayError]}>
              <Text style={styles.pendingLabel}>{photoError ? t('upload_failed') : t('sending')}</Text>
              {photoError ? <Text style={styles.pendingRetry}>{t('tap_retry')}</Text> : null}
            </View>
          </Pressable>
          {photoError ? (
            <Pressable style={styles.pendingClose} onPress={dismissPhoto} hitSlop={8} accessibilityLabel="Dismiss photo">
              <Text style={styles.pendingCloseX}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isListening ? (
        <View style={styles.waveformCard}>
          <View style={styles.waveformTop}>
            <WaveBars />
            <Text style={styles.waveTimer}>{formatTime(elapsed)}</Text>
          </View>
          <View style={styles.waveActions}>
            <Pressable style={[styles.waveDeleteBtn, compact && styles.waveDeleteBtnCompact]} onPress={cancelVoice} accessibilityLabel="Cancel recording">
              <Trash width={trashSize} height={trashSize} color={colors.feedbackRed} />
            </Pressable>
            <Pressable onPress={finishVoice} accessibilityLabel="Stop and transcribe">
              <SendCircle size={sendSize} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {isTranscribing ? (
        <View style={styles.transcribingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={compact ? styles.voiceDisplayCompact : styles.voiceDisplay}>{t('transcribing')}</Text>
        </View>
      ) : null}

      {waitingForAi && !isListening && !isTranscribing ? (
        <View style={styles.transcribingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={compact ? styles.voiceDisplayCompact : styles.voiceDisplay}>{t('waiting_for_ai')}</Text>
        </View>
      ) : null}

      {!isListening && !isTranscribing ? (
        <View style={styles.inputArea}>
          <TextInput
            style={urduAwareTextStyle(text, compact ? styles.textInputCompact : styles.textInput)}
            placeholder={t('chat_placeholder')}
            placeholderTextColor={colors.textMuted2}
            value={text}
            onChangeText={handleChangeText}
            onFocus={onInputFocus}
            multiline
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={handleSend}
          />
        </View>
      ) : null}

      {!isListening && !isTranscribing ? (
        <View style={styles.actions}>
          <View style={[styles.leftIcons, compact && styles.leftIconsCompact]}>
            <Pressable style={styles.iconBtn} onPress={() => { logTap('student:mic'); if (waitingForAi) setWaitingForAi(false); else requestMic(); }} accessibilityLabel="Voice input">
              <MicIcon width={micW} height={micW} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => { logTap('student:camera'); setShowCamera(true); }} disabled={busy} accessibilityLabel="Camera">
              <CameraIcon width={camW} height={camW} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Pressable onPress={handleSend} disabled={!text.trim()} style={[!text.trim() && styles.sendDisabled]} accessibilityLabel="Send">
            <SendCircle size={sendSize} />
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
  barCompact: { paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 14 },
  inputArea: { minHeight: 44, justifyContent: 'center' },
  // Fredoka inputs: caret matches glyph height, text is readable (Item 1). The
  // Urdu path still swaps to Nastaliq via urduAwareTextStyle at call sites.
  textInput: { fontFamily: fonts.headingRegular, fontSize: 26, lineHeight: 26, color: colors.textPrimary, padding: 0, minHeight: 44 },
  textInputCompact: { fontFamily: fonts.headingRegular, fontSize: 21, lineHeight: 21, color: colors.textPrimary, padding: 0, minHeight: 40 },
  voiceDisplay: { fontFamily: fonts.headingRegular, fontSize: 26, lineHeight: 30, color: colors.textPrimary },
  voiceDisplayCompact: { fontFamily: fonts.headingRegular, fontSize: 21, lineHeight: 25, color: colors.textPrimary },
  transcribingRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },

  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftIcons: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingLeft: 6 },
  leftIconsCompact: { gap: 14, paddingLeft: 2 },
  iconBtn: { alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 },
  sendDisabled: { opacity: 0.4 },

  // Recording state fills the FULL width of the input bar (Item 4).
  waveformCard: { width: '100%', gap: 12 },
  waveformTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Bars stretch edge-to-edge (space-between) instead of clumping on the left.
  waveBars: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 },
  waveBar: { width: 3, backgroundColor: colors.textPrimary, borderRadius: 2 },
  waveTimer: { fontFamily: fonts.body, fontSize: 20, lineHeight: 24, color: colors.textPrimary, minWidth: 52, textAlign: 'right' },
  // Trash (left) + send (right) span the full width.
  waveActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waveDeleteBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(244, 88, 88, 0.12)', alignItems: 'center', justifyContent: 'center' },
  waveDeleteBtnCompact: { width: 40, height: 40, borderRadius: 20 },

  pendingWrap: { alignSelf: 'flex-end', width: 96, height: 96 },
  pendingInner: { width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden' },
  pendingImg: { width: '100%', height: '100%', opacity: 0.6 },
  pendingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: 'rgba(0,0,0,0.25)' },
  pendingOverlayError: { backgroundColor: 'rgba(244,88,88,0.5)' },
  pendingLabel: { fontFamily: fonts.body, fontSize: 14, lineHeight: 17, color: '#FFFFFF', textAlign: 'center' },
  pendingRetry: { fontFamily: fonts.body, fontSize: 12, lineHeight: 15, color: '#FFFFFF', textAlign: 'center', marginTop: 2 },
  pendingClose: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  pendingCloseX: { fontSize: 13, color: '#FFFFFF', lineHeight: 15 },
});
