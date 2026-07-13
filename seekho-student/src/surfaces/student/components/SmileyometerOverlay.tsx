import React, { useRef } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { logEvent, setSmileyometerQuestion } from '../../../firebase/admin';
import { colors, fonts } from '../../../theme';
import type { AdminControl } from '../../../types/admin';

/**
 * Full-screen Smileyometer feedback capture, mounted once at the StudentApp
 * level so it floats above every screen (chat / workbook / home).
 *
 * The admin console pushes `adminControl.smileyometerQuestion` (1–6, or null).
 * The question set, the 5-point face scale, AND the eventLog label schema are
 * copied 1:1 from the web student surface
 * (app/seekho-sikhao-woz/src/surfaces/student/components/SmileyometerOverlay.tsx)
 * so both surfaces deliver the SAME research instrument and write identical
 * events. On tap we log `smileyometer:q{n}:response:{score}` (score 1–5), then
 * clear the admin flag — which unmounts this overlay. By design the child MUST
 * tap a face: there is no close button, and nothing outside a face dismisses it.
 */
const QUESTIONS: Record<number, { section: string; text: string }> = {
  1: { section: 'Part A — Seekho Sikhao App', text: 'How did you feel using the app?' },
  2: { section: 'Part A — Seekho Sikhao App', text: 'How easy was it to understand what the app said?' },
  3: { section: 'Part A — Seekho Sikhao App', text: 'Would you use this app for homework?' },
  4: { section: 'Part B — About ChatGPT', text: 'How did you feel using ChatGPT?' },
  5: { section: 'Part B — About ChatGPT', text: 'How easy was it to understand what ChatGPT said?' },
  6: { section: 'Part B — About ChatGPT', text: 'Would you use ChatGPT for homework?' },
};

const FACES = ['😞', '😕', '😐', '🙂', '😄'];
// Standard 5-point Smileyometer wording (1 = awful … 5 = brilliant), shown as a
// gentle reading aid under each face for young children. The logged score is
// always the 1–5 face index, so the labels are purely presentational.
const LABELS = ['Awful', 'Bad', 'Okay', 'Good', 'Brilliant'];

interface Props {
  roomCode: string;
  questionNum: number;
  adminControl?: AdminControl;
}

export default function SmileyometerOverlay({ roomCode, questionNum, adminControl }: Props) {
  const q = QUESTIONS[questionNum];
  // Guard against a fast double-tap logging two responses / clearing twice.
  const answeredRef = useRef(false);

  if (!q) return null;

  async function handleFace(score: number) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    // SAME label schema as the web overlay: smileyometer:q{n}:response:{score}.
    logEvent(roomCode, `smileyometer:q${questionNum}:response:${score}`, 'student_app', {
      sessionStartTime: adminControl?.sessionStartTime,
      activeTask: adminControl?.activeTask,
      studentName: adminControl?.studentName,
      grade: adminControl?.grade,
    });
    // Reset the admin flag to null — StudentApp then unmounts this overlay.
    await setSmileyometerQuestion(roomCode, null);
  }

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
      // Research design: the child must tap a face. Swallow the hardware/back
      // dismissal so the overlay can never be closed without answering.
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.section}>{q.section}</Text>
          <Text style={styles.question}>{q.text}</Text>
          <View style={styles.faces}>
            {FACES.map((face, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.faceBtn, pressed && styles.faceBtnPressed]}
                onPress={() => handleFace(i + 1)}
                accessibilityRole="button"
                accessibilityLabel={`${LABELS[i]} (${i + 1} of 5)`}
              >
                <Text style={styles.faceEmoji}>{face}</Text>
                <Text style={styles.faceLabel}>{LABELS[i]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFCF8',
    borderRadius: 28,
    paddingVertical: 40,
    paddingHorizontal: 48,
    maxWidth: 940,
    width: '94%',
    alignItems: 'center',
    gap: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 48,
    elevation: 20,
  },
  section: { fontFamily: fonts.heading, fontSize: 18, letterSpacing: 0.4, color: colors.primary, textAlign: 'center' },
  question: { fontFamily: fonts.heading, fontSize: 30, lineHeight: 40, color: colors.textPrimary, textAlign: 'center', maxWidth: 780 },
  faces: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 16, marginTop: 8 },
  // Big, kid-friendly targets (132×132 ≫ the 72pt minimum).
  faceBtn: {
    width: 132,
    minHeight: 132,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  faceBtnPressed: {
    backgroundColor: 'rgba(42,186,242,0.14)',
    borderColor: colors.primary,
    transform: [{ scale: 0.96 }],
  },
  faceEmoji: { fontSize: 60, lineHeight: 70 },
  faceLabel: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.textMuted, textAlign: 'center' },
});
