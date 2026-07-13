import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import {
  MathIcon,
  TypeSquare,
  MicSquare,
  CameraSquare,
  PlayTriangle,
  Pencil,
  Zap,
} from '../../../components/icons';
import { useLanguage } from '../../../context/LanguageContext';
import { STRINGS, type StringKey } from '../../../translations';
import { logTap } from '../../../lib/autolog';
import { colors, fonts } from '../../../theme';

/**
 * First-run tutorial (Item I).
 *
 * A child-friendly, bilingual (English + Roman Urdu), skippable walkthrough of
 * the core flow. Shown automatically the first time the student reaches the
 * subjects screen and replayable any time from the "?" help button there.
 *
 * "Seen" is tracked with a module-level flag rather than AsyncStorage — that
 * native dependency isn't installed, and the always-available help button means
 * a per-session flag is enough. It resets when the app process restarts, which
 * is fine for a shared classroom iPad.
 */
let seen = false;
export function hasTutorialBeenSeen() {
  return seen;
}
export function markTutorialSeen() {
  seen = true;
}

interface Step {
  titleKey: StringKey;
  bodyKey: StringKey;
  tint: string;
}

const STEPS: Step[] = [
  { titleKey: 'tut_1_title', bodyKey: 'tut_1_body', tint: '#CE6161' },
  { titleKey: 'tut_2_title', bodyKey: 'tut_2_body', tint: colors.primary },
  { titleKey: 'tut_3_title', bodyKey: 'tut_3_body', tint: colors.primary },
  { titleKey: 'tut_4_title', bodyKey: 'tut_4_body', tint: '#FF7B00' },
  { titleKey: 'tut_5_title', bodyKey: 'tut_5_body', tint: '#FF7B00' },
];

// Rendered at runtime (not module-eval) so it can reference `styles`.
function StepIcon({ index }: { index: number }) {
  switch (index) {
    case 0:
      return <MathIcon size={64} />;
    case 1:
      return (
        <View style={styles.iconRow}>
          <TypeSquare size={52} />
          <MicSquare size={52} />
          <CameraSquare size={52} />
        </View>
      );
    case 2:
      return (
        <View style={[styles.glyphCircle, { backgroundColor: 'rgba(42,186,242,0.15)' }]}>
          <PlayTriangle width={30} height={34} color={colors.primary} />
        </View>
      );
    case 3:
      return (
        <View style={[styles.glyphCircle, { backgroundColor: '#FFF3D6' }]}>
          <Pencil width={38} height={38} color="#FF7B00" />
        </View>
      );
    default:
      return (
        <View style={[styles.glyphCircle, { backgroundColor: '#FFF9DE' }]}>
          <Zap width={34} height={38} color="#FF7B00" />
        </View>
      );
  }
}

interface Props {
  onClose: () => void;
}

export default function TutorialOverlay({ onClose }: Props) {
  const { t, language } = useLanguage();
  const [index, setIndex] = useState(0);
  const other = language === 'en' ? 'ur' : 'en';
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  function finish() {
    markTutorialSeen();
    onClose();
  }

  return (
    <Modal transparent visible animationType="fade" supportedOrientations={['landscape', 'landscape-left', 'landscape-right']} onRequestClose={finish}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{t('tut_title')}</Text>
            <Pressable style={styles.skipBtn} onPress={() => { logTap('student:tutorial-skip'); finish(); }} hitSlop={8} accessibilityLabel="Skip tutorial">
              <Text style={styles.skipText}>{t('tut_skip')}</Text>
            </Pressable>
          </View>

          <View style={styles.iconArea}><StepIcon index={index} /></View>

          <Text style={[styles.stepTitle, { color: step.tint }]}>{t(step.titleKey)}</Text>
          <Text style={styles.stepBody}>{t(step.bodyKey)}</Text>
          <Text style={styles.stepBodyAlt}>{STRINGS[other][step.bodyKey]}</Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.footer}>
            <Pressable
              style={styles.backBtn}
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              accessibilityLabel="Previous"
            >
              <Text style={[styles.backText, index === 0 && styles.backTextDisabled]}>‹</Text>
            </Pressable>

            <Pressable
              style={styles.nextBtn}
              onPress={() => {
                if (isLast) { logTap('student:tutorial-done'); finish(); }
                else { logTap('student:tutorial-next'); setIndex((i) => i + 1); }
              }}
              accessibilityLabel={isLast ? 'Start' : 'Next'}
            >
              <Text style={styles.nextText}>{isLast ? t('tut_start') : t('tut_next')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: 640,
    maxWidth: '100%',
    backgroundColor: '#FFFCF8',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
    elevation: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  headerTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.textMuted },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  skipText: { fontFamily: fonts.heading, fontSize: 20, color: colors.textMuted2 },

  iconArea: { height: 96, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyphCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },

  stepTitle: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 38, textAlign: 'center' },
  stepBody: { fontFamily: fonts.body, fontSize: 21, lineHeight: 28, color: colors.textPrimary, textAlign: 'center', maxWidth: 520 },
  stepBodyAlt: { fontFamily: fonts.body, fontSize: 17, lineHeight: 22, color: colors.textMuted2, textAlign: 'center', maxWidth: 520 },

  dots: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.15)' },
  dotActive: { backgroundColor: colors.primary, width: 22 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  backBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 40, lineHeight: 44, color: colors.textMuted, marginTop: -4 },
  backTextDisabled: { opacity: 0.25 },
  nextBtn: { minWidth: 160, height: 56, paddingHorizontal: 32, borderRadius: 999, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  nextText: { fontFamily: fonts.heading, fontSize: 24, color: '#FFFFFF' },
});
