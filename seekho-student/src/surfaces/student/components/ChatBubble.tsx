import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { MicIcon, PlayTriangle, PauseBars, Pencil, Zap } from '../../../components/icons';
import { colors, fonts } from '../../../theme';
import { urduAwareTextStyle } from '../../../lib/textStyle';
import { useLanguage } from '../../../context/LanguageContext';
import type { MessageRole, MessageType } from '../../../types/session';

interface Props {
  role: MessageRole;
  text: string;
  type: MessageType;
  photoURL?: string | null;
  workbookCorrect?: boolean;
  isHint?: boolean;
  isCorrect?: boolean;
  readAloudText?: string;
  onSpeak?: () => void;
  /** This message currently owns the read-aloud channel (pause icon + reveal). */
  isPlaying?: boolean;
  /** 0→1 voice progress for the karaoke reveal; only used while `isPlaying`. */
  revealProgress?: number;
  /** Narrow (workbook) mode — shrinks the play button and paddings. */
  compact?: boolean;
}

/**
 * Split `text` at the word boundary implied by `progress` (0→1). The returned
 * `hidden` tail is rendered transparent (not removed) so the bubble keeps its
 * full height and never reflows as words appear. Whitespace/newlines are
 * preserved — the trailing gap after the last revealed word rides along with the
 * revealed part (it is invisible either way), so equations on their own line
 * stay put. While a message is playing it always shows at least its first word
 * (never a fully blank bubble) and grows from there in sync with the voice.
 */
// Reveal the text slightly AHEAD of the voice. The displayed (Roman) and spoken
// (Urdu) word counts differ, which left the text trailing the audio by a word or
// two — confusing to read. Biasing the reveal forward by this fraction of the
// clip keeps the words at or just ahead of the voice (text leads, voice catches
// up), which reads far more naturally than lagging behind it.
const REVEAL_LEAD = 0.14;

function splitRevealed(text: string, progress: number): { revealed: string; hidden: string } {
  const total = (text.match(/\S+/g) ?? []).length;
  if (total === 0) return { revealed: text, hidden: '' };
  const revealCount = Math.max(1, Math.ceil((progress + REVEAL_LEAD) * total));
  if (revealCount >= total) return { revealed: text, hidden: '' };

  const re = /\S+/g;
  let count = 0;
  let endIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    count++;
    endIdx = m.index + m[0].length;
    if (count >= revealCount) break;
  }
  while (endIdx < text.length && /\s/.test(text[endIdx])) endIdx++;
  return { revealed: text.slice(0, endIdx), hidden: text.slice(endIdx) };
}

export default function ChatBubble({
  role,
  text,
  type,
  photoURL,
  workbookCorrect,
  isHint,
  isCorrect,
  onSpeak,
  isPlaying,
  revealProgress,
  compact,
}: Props) {
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
          <Text style={urduAwareTextStyle(text, styles.answerText)}>{text}</Text>
        </View>
      </View>
    );
  }

  const isAi = role === 'ai';
  const showPlay = isAi && !!onSpeak;
  const showHint = isAi && !!isHint;
  const showCorrect = isAi && !!isCorrect && !showHint;

  const bubbleVariant = !isAi
    ? styles.bubbleStudent
    : showHint
      ? styles.bubbleHint
      : showCorrect
        ? styles.bubbleCorrect
        : styles.bubbleAi;

  // Correct AI messages use green body text; hint keeps the dark text on yellow.
  const textStyle = [
    urduAwareTextStyle(text, styles.text),
    showCorrect && styles.textCorrect,
  ];

  return (
    <View style={isAi ? styles.colStart : styles.colEnd}>
      <View style={[styles.bubble, bubbleVariant]}>
        {showHint ? (
          <View style={styles.badgeRow}>
            <Zap width={15} height={16} color="#FF7B00" />
            <Text style={styles.hintBadgeText}>{t('hint')}</Text>
          </View>
        ) : null}

        {showCorrect ? (
          <View style={styles.badgeRow}>
            <View style={styles.checkCircle}><Text style={styles.checkMark}>✓</Text></View>
            <Text style={styles.correctBadgeText}>{t('correct')}</Text>
          </View>
        ) : null}

        {type === 'photo' && photoURL ? (
          <Image style={styles.photo} source={{ uri: photoURL }} resizeMode="cover" />
        ) : null}

        {type === 'voice' ? (
          <View style={styles.voiceRow}>
            <MicIcon width={22} height={22} color={colors.textPrimary} />
            <Text style={urduAwareTextStyle(text || t('voice_message'), styles.text)}>{text || t('voice_message')}</Text>
          </View>
        ) : null}

        {type === 'text' && !!text ? (
          isPlaying && typeof revealProgress === 'number' && revealProgress < 1 ? (
            (() => {
              const { revealed, hidden } = splitRevealed(text, revealProgress);
              return (
                <Text style={textStyle}>
                  {revealed}
                  {hidden ? <Text style={styles.hiddenText}>{hidden}</Text> : null}
                </Text>
              );
            })()
          ) : (
            <Text style={textStyle}>{text}</Text>
          )
        ) : null}
      </View>

      {showPlay ? (
        <Pressable
          style={[styles.playBtn, compact && styles.playBtnCompact, isPlaying && styles.playBtnActive]}
          onPress={onSpeak}
          hitSlop={10}
          accessibilityLabel={isPlaying ? 'Stop' : 'Listen again'}
        >
          {isPlaying ? (
            <PauseBars
              width={compact ? 11 : 14}
              height={compact ? 13 : 16}
              color={colors.textPrimary}
            />
          ) : (
            <PlayTriangle
              width={compact ? 11 : 14}
              height={compact ? 13 : 16}
              color={colors.textPrimary}
            />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  colStart: { alignItems: 'flex-start', width: '100%' },
  colEnd: { alignItems: 'flex-end', width: '100%' },
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
  // Hint — yellow with a warm left accent (Item A2).
  bubbleHint: {
    backgroundColor: '#FFF9DE',
    borderWidth: 1,
    borderColor: 'rgba(255,123,0,0.35)',
    borderLeftWidth: 5,
    borderLeftColor: '#FF7B00',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
  },
  // Correct — green confirmation (Item A3).
  bubbleCorrect: {
    backgroundColor: 'rgba(42,242,139,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(30,158,90,0.55)',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
  },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  hintBadgeText: { fontFamily: fonts.heading, fontSize: 18, color: '#FF7B00', letterSpacing: 0.3 },
  correctBadgeText: { fontFamily: fonts.heading, fontSize: 18, color: '#1E9E5A', letterSpacing: 0.3 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(42,242,139,0.4)', alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 14, color: '#1E9E5A', fontWeight: '700', marginTop: -1 },

  text: { fontFamily: fonts.body, fontSize: 22, lineHeight: 30, color: colors.textPrimary },
  textCorrect: { color: '#1E9E5A' },
  // Not-yet-revealed tail during the karaoke reveal — laid out but not painted,
  // so the bubble keeps its full size and never jumps as words appear.
  hiddenText: { color: 'transparent' },
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
  answerText: { fontFamily: fonts.bodyMedium, fontSize: 24, lineHeight: 30, color: colors.textPrimary },

  // Play button lives OUTSIDE the bubble, below-left of an AI message (Item A1).
  playBtn: {
    marginTop: 8,
    marginLeft: 4,
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
  playBtnCompact: {
    marginTop: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.25,
    paddingLeft: 2,
  },
  // Pause bars are symmetric — drop the play triangle's optical left nudge.
  playBtnActive: { paddingLeft: 0 },
});
