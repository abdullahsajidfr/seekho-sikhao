import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Pencil } from '../../../components/icons';
import { fonts } from '../../../theme';

interface Props {
  question: string;
  onTry: () => void;
}

export default function WorkbookQuestionCard({ question, onTry }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.prompt}>Try this question!</Text>
      <View style={styles.row}>
        <Text style={styles.question} numberOfLines={1}>{question}</Text>
        <Pressable style={styles.tryBtn} onPress={onTry} hitSlop={10} accessibilityLabel="Open workbook">
          <Pencil width={22} height={22} color="#FF7B00" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF9DE',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    width: 268,
  },
  prompt: { fontFamily: fonts.body, fontSize: 18, lineHeight: 20, color: '#FF7B00' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  question: { fontFamily: fonts.body, fontSize: 26, lineHeight: 28, color: '#0C759E', flex: 1 },
  tryBtn: { flexShrink: 0, paddingLeft: 8 },
});
