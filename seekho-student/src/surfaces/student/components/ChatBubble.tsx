import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { MicIcon, PlayTriangle, Pencil } from '../../../components/icons';
import { colors, fonts } from '../../../theme';
import { useLanguage } from '../../../context/LanguageContext';
import type { MessageRole, MessageType } from '../../../types/session';

interface Props {
  role: MessageRole;
  text: string;
  type: MessageType;
  photoURL?: string | null;
  workbookCorrect?: boolean;
  readAloudText?: string;
  onSpeak?: () => void;
}

export default function ChatBubble({ role, text, type, photoURL, workbookCorrect, onSpeak }: Props) {
  const { t } = useLanguage();

  // Workbook answer chip — pencil + answer, pink (wrong) / green (correct).
  if (type === 'workbook_answer') {
    const tint = workbookCorrect ? '#1E9E5A' : '#D0453B';
    return (
      <View style={styles.rowEnd}>
        <View style={[styles.answerBubble, { backgroundColor: workbookCorrect ? 'rgba(42,242,139,0.18)' : 'rgba(244,88,88,0.18)' }]}>
          <View style={[styles.answerIconCircle, { backgroundColor: workbookCorrect ? 'rgba(42,242,139,0.35)' : 'rgba(244,88,88,0.30)' }]}>
            <Pencil width={16} height={16} color={tint} />
          </View>
          <Text style={styles.answerText}>{text}</Text>
        </View>
      </View>
    );
  }

  const isAi = role === 'ai';
  const showPlay = isAi && !!onSpeak;

  return (
    <View style={isAi ? styles.rowStart : styles.rowEnd}>
      <View
        style={[
          styles.bubble,
          isAi ? styles.bubbleAi : styles.bubbleStudent,
          showPlay && styles.bubbleWithPlay,
        ]}
      >
        {type === 'photo' && photoURL ? (
          <Image style={styles.photo} source={{ uri: photoURL }} resizeMode="cover" />
        ) : null}

        {type === 'voice' ? (
          <View style={styles.voiceRow}>
            <MicIcon width={20} height={26} color={colors.textPrimary} />
            <Text style={styles.text}>{text || t('voice_message')}</Text>
          </View>
        ) : null}

        {type === 'text' && !!text ? (
          <Text style={styles.text}>{text}</Text>
        ) : null}

        {showPlay ? (
          <Pressable style={styles.speakBtn} onPress={onSpeak} hitSlop={8} accessibilityLabel="Listen again">
            <PlayTriangle width={14} height={16} color={colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowStart: { flexDirection: 'row', justifyContent: 'flex-start', width: '100%' },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%' },

  bubble: { maxWidth: 650, paddingVertical: 14, paddingHorizontal: 20 },
  bubbleAi: {
    backgroundColor: colors.aiBubble,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
  },
  bubbleStudent: {
    backgroundColor: colors.userBubble,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 16,
  },
  bubbleWithPlay: { paddingBottom: 48 },

  text: { fontFamily: fonts.body, fontSize: 32, lineHeight: 34, color: colors.textPrimary },
  photo: { width: 260, height: 200, borderRadius: 8, marginBottom: 4 },

  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  answerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 16,
    minWidth: 80,
  },
  answerIconCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  answerText: { fontFamily: fonts.body, fontSize: 34, lineHeight: 34, color: colors.textPrimary },

  speakBtn: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
});
