import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Pencil } from '../../../components/icons';
import { fonts } from '../../../theme';
import { urduAwareTextStyle } from '../../../lib/textStyle';
import { useLanguage } from '../../../context/LanguageContext';

interface Props {
  question: string;
  onTry?: () => void;
  /** Read-only variant (e.g. inside the workbook, where the try button is redundant). */
  readOnly?: boolean;
  /** Narrow layout for the workbook's left chat panel. */
  compact?: boolean;
}

/**
 * "Try this question!" practice-problem card. The question sits on its OWN
 * full-width line (never in a flex row competing with the pencil), so the full
 * problem always shows and wraps instead of clipping to "Work o…" (Item B).
 */
export default function WorkbookQuestionCard({ question, onTry, readOnly, compact }: Props) {
  const { t } = useLanguage();
  const interactive = !readOnly && !!onTry;

  const body = (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.headerRow}>
        <Text style={[styles.prompt, compact && styles.promptCompact]}>{t('try_this')}</Text>
        {interactive ? (
          <View style={styles.tryBtn} accessible accessibilityLabel="Open workbook">
            <Pencil width={compact ? 20 : 24} height={compact ? 20 : 24} color="#FF7B00" />
          </View>
        ) : null}
      </View>
      <Text style={urduAwareTextStyle(question, compact ? styles.questionCompact : styles.question)}>
        {question}
      </Text>
    </View>
  );

  if (interactive) {
    return (
      <Pressable onPress={onTry} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Open workbook: ${question}`}>
        {body}
      </Pressable>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF9DE',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,123,0,0.35)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: 560,
  },
  cardCompact: { paddingVertical: 10, paddingHorizontal: 14, gap: 4, maxWidth: '100%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  prompt: { fontFamily: fonts.bodyMedium, fontSize: 17, lineHeight: 20, color: '#FF7B00' },
  promptCompact: { fontSize: 15, lineHeight: 18 },
  tryBtn: { flexShrink: 0, paddingLeft: 4 },
  // Own full-width line — no flex competition, so the full problem always shows (Item B).
  question: { fontFamily: fonts.bodyMedium, fontSize: 27, lineHeight: 34, color: '#0C759E' },
  questionCompact: { fontFamily: fonts.bodyMedium, fontSize: 22, lineHeight: 30, color: '#0C759E' },
});
