import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MathIcon, ScienceIcon, IslamiyatIcon, SocialIcon } from '../../../components/icons';
import { logTap } from '../../../lib/autolog';
import { fonts } from '../../../theme';
import type { Subject } from '../../../types/session';

interface SubjectConfig {
  bg: string;
  border: string;
  iconBg: string;
  textColor: string;
  glyph: 'math' | 'science' | 'islamiyat' | 'social' | 'text';
  iconText?: string;
  iconFont?: string;
  /** Per-glyph override — Quicksand's wider "Abc" needs a smaller size than the
   *  shared default so it stays inside the 34px icon box (Urdu keeps the default). */
  iconSize?: number;
}

const SUBJECT_CONFIG: Record<Subject, SubjectConfig> = {
  Mathematics: { bg: '#FFD2D3', border: '#CE6161', iconBg: '#CE6161', textColor: '#CE6161', glyph: 'math' },
  English: { bg: '#D6F4FF', border: '#0C759E', iconBg: '#0C759E', textColor: '#0C759E', glyph: 'text', iconText: 'Abc', iconFont: fonts.body, iconSize: 16 },
  Science: { bg: '#FFE1D3', border: '#FF5100', iconBg: '#FF5100', textColor: '#FF5100', glyph: 'science' },
  Islamiyat: { bg: '#E5D3FF', border: '#4E00BA', iconBg: '#4E00BA', textColor: '#4E00BA', glyph: 'islamiyat' },
  'Social Studies': { bg: '#FFFDD3', border: '#D6CB01', iconBg: '#D6CB01', textColor: '#D6CB01', glyph: 'social' },
  Urdu: { bg: '#D3FFE4', border: '#009A3B', iconBg: '#009A3B', textColor: '#009A3B', glyph: 'text', iconText: 'اردو', iconFont: fonts.urdu },
};

interface Props {
  subject: Subject;
  grade?: string;
  onPress: () => void;
}

export default function SubjectCard({ subject, grade = 'Grade 4, Section A', onPress }: Props) {
  const cfg = SUBJECT_CONFIG[subject];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border }, pressed && styles.pressed]}
      onPress={() => { logTap(`student:subject-${subject.toLowerCase().replace(/\s+/g, '-')}`); onPress(); }}
    >
      {/* One shared 34×34 rounded badge for every subject so the icons sit in an
          identical, centred box on each card. The SVG glyphs carry their own
          same-colour fill, but their 31×29 artboard letterboxes to a SHORTER
          rectangle at 34×34; the same-colour box fills that gap into a true
          square, matching the English/Urdu text badges beside them in the grid. */}
      <View style={[styles.iconBox, { backgroundColor: cfg.iconBg }]}>
        {cfg.glyph === 'math' && <MathIcon size={34} />}
        {cfg.glyph === 'science' && <ScienceIcon size={34} />}
        {cfg.glyph === 'islamiyat' && <IslamiyatIcon size={34} />}
        {cfg.glyph === 'social' && <SocialIcon size={34} />}
        {cfg.glyph === 'text' && (
          <Text style={[styles.iconText, { fontFamily: cfg.iconFont }, cfg.iconSize ? { fontSize: cfg.iconSize } : null]}>{cfg.iconText}</Text>
        )}
      </View>
      <View style={styles.textGroup}>
        <Text style={[styles.subjectName, { color: cfg.textColor }]}>{subject}</Text>
        <Text style={styles.grade}>{grade}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 108,
    width: '100%',
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderRadius: 27,
  },
  pressed: { opacity: 0.82 },
  iconBox: { width: 34, height: 34, borderRadius: 5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iconText: { fontSize: 19, color: '#FFFFFF', lineHeight: 22 },
  textGroup: { gap: 2, flexShrink: 1 },
  subjectName: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 30 },
  grade: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: '#444444' },
});
