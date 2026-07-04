import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BackArrow } from '../../../components/icons';
import { logTap } from '../../../lib/autolog';
import { colors, fonts } from '../../../theme';

interface Props {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export default function TopBar({ title, showBack, onBack, rightSlot }: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable style={styles.backBtn} onPress={() => { logTap('student:back'); onBack?.(); }} hitSlop={8} accessibilityLabel="Go back">
            <BackArrow width={22} height={22} color={colors.textPrimary} />
            {title ? <Text style={styles.backLabel}>{title}</Text> : null}
          </Pressable>
        ) : (
          title ? <Text style={styles.title}>{title}</Text> : null
        )}
      </View>
      {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.topBar,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingRight: 6 },
  backLabel: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary },
});
