import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { setSubject as fbSetSubject } from '../../../firebase/session';
import SubjectCard from '../components/SubjectCard';
import { SettingsMenu } from '../components/overlays';
import { Logo, SettingsGear } from '../../../components/icons';
import { colors, fonts } from '../../../theme';
import type { Subject } from '../../../types/session';

const SUBJECTS: Subject[] = ['Mathematics', 'English', 'Islamiyat', 'Science', 'Social Studies', 'Urdu'];

interface Props {
  roomCode: string;
  studentName: string;
  onSelect: (subject: Subject) => void;
  onLogout: () => void;
}

export default function SubjectScreen({ roomCode, studentName, onSelect, onLogout }: Props) {
  const [showSettings, setShowSettings] = useState(false);

  async function handleSelect(subject: Subject) {
    await fbSetSubject(roomCode, subject);
    onSelect(subject);
  }

  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <Logo height={40} />
        <Pressable onPress={() => setShowSettings(true)} hitSlop={10} accessibilityLabel="Settings">
          <SettingsGear width={32} height={32} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.greeting}>
          <Text style={styles.greetName}>Hello{studentName ? `, ${studentName}` : ''}!</Text>
          <Text style={styles.greetSub}>What would you like to learn today?</Text>
        </View>

        <View style={styles.grid}>
          {SUBJECTS.map((subject) => (
            <View key={subject} style={styles.cell}>
              <SubjectCard subject={subject} onPress={() => handleSelect(subject)} />
            </View>
          ))}
        </View>
      </View>

      {showSettings ? (
        <SettingsMenu
          onClose={() => setShowSettings(false)}
          onLogOut={() => { setShowSettings(false); onLogout(); }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg1 },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 24,
    backgroundColor: colors.topBar,
  },
  body: { flex: 1, paddingHorizontal: 47, paddingVertical: 32, gap: 56 },
  greeting: { gap: 6 },
  greetName: { fontFamily: fonts.heading, fontSize: 36, lineHeight: 42, color: colors.textPrimary },
  greetSub: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 33, color: colors.textPrimary },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 28,
    maxWidth: 1055,
    width: '100%',
    alignSelf: 'center',
  },
  cell: { width: '31%' },
});
