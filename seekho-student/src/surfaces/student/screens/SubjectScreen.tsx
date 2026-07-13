import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { setSubject as fbSetSubject } from '../../../firebase/session';
import SubjectCard from '../components/SubjectCard';
import { SettingsMenu, type Anchor } from '../components/overlays';
import TutorialOverlay, { hasTutorialBeenSeen } from '../components/TutorialOverlay';
import { Logo, SettingsGear } from '../../../components/icons';
import { logTap } from '../../../lib/autolog';
import { useLanguage } from '../../../context/LanguageContext';
import { colors, fonts } from '../../../theme';
import type { Subject } from '../../../types/session';

const SUBJECTS: Subject[] = ['Mathematics', 'English', 'Islamiyat', 'Science', 'Social Studies', 'Urdu'];

interface Props {
  roomCode: string;
  studentName: string;
  /** True only on the very first login of a brand-new account. */
  isNew: boolean;
  onSelect: (subject: Subject) => void;
  onLogout: () => void;
}

export default function SubjectScreen({ roomCode, studentName, isNew, onSelect, onLogout }: Props) {
  const { t } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<Anchor | undefined>(undefined);
  const gearRef = useRef<View>(null);
  // Show the walkthrough ONLY on the first login of a brand-new account — never
  // for existing accounts. (The `?` help button still opens it on demand.)
  const [showTutorial, setShowTutorial] = useState(() => isNew && !hasTutorialBeenSeen());

  async function handleSelect(subject: Subject) {
    await fbSetSubject(roomCode, subject);
    onSelect(subject);
  }

  // Measure the gear and drop the settings menu just under it (right-aligned).
  function openSettings() {
    logTap('student:settings');
    const node = gearRef.current;
    if (node?.measureInWindow) {
      node.measureInWindow((x, y, w, h) => {
        setSettingsAnchor({ top: y + h + 8, right: Math.max(12, Dimensions.get('window').width - (x + w)) });
        setShowSettings(true);
      });
    } else {
      setShowSettings(true);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <Logo height={40} />
        <View style={styles.topRight}>
          <Pressable
            style={styles.helpBtn}
            onPress={() => { logTap('student:help'); setShowTutorial(true); }}
            hitSlop={10}
            accessibilityLabel={t('tut_help')}
          >
            <Text style={styles.helpMark}>?</Text>
          </Pressable>
          <Pressable ref={gearRef} onPress={openSettings} hitSlop={10} accessibilityLabel="Settings">
            <SettingsGear width={32} height={32} color={colors.textMuted} />
          </Pressable>
        </View>
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
          anchor={settingsAnchor}
          onClose={() => setShowSettings(false)}
          onLogOut={() => { setShowSettings(false); onLogout(); }}
        />
      ) : null}

      {showTutorial ? <TutorialOverlay onClose={() => setShowTutorial(false)} /> : null}
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
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  helpBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpMark: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 26, color: colors.primary, marginTop: -1 },
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
