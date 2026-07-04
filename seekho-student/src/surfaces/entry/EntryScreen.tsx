import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { roomExists } from '../../firebase/session';
import { logTap } from '../../lib/autolog';
import { colors, fonts } from '../../theme';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '✓'];

interface Props {
  onEnter: (roomCode: string) => void;
}

export default function EntryScreen({ onEnter }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleKey(key: string) {
    if (loading) return;
    if (key === '←') {
      setCode((c) => c.slice(0, -1));
      setError('');
    } else if (key === '✓') {
      if (code.length !== 4) return;
      logTap('entry:enter');
      setLoading(true);
      try {
        const exists = await roomExists(code);
        if (exists) onEnter(code);
        else setError('Room not found. Check the code.');
      } finally {
        setLoading(false);
      }
    } else if (code.length < 4) {
      setCode((c) => c + key);
      setError('');
    }
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Seekho Sikhao</Text>
      <Text style={styles.sub}>Enter your room code</Text>

      <View style={styles.display}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.digit}>
            <Text style={styles.digitText}>{code[i] ?? '–'}</Text>
          </View>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.pad}>
        {DIGITS.map((k) => (
          <Pressable key={k} style={({ pressed }) => [styles.key, pressed && styles.keyActive]} onPress={() => handleKey(k)}>
            <Text style={styles.keyText}>{k}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 },
  title: { fontFamily: fonts.heading, fontSize: 45, color: colors.primary },
  sub: { fontFamily: fonts.body, fontSize: 24, color: colors.textMuted },
  display: { flexDirection: 'row', gap: 16 },
  digit: {
    width: 64,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg2,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
  },
  digitText: { fontFamily: fonts.heading, fontSize: 36, color: colors.textPrimary },
  error: { fontFamily: fonts.body, fontSize: 18, color: colors.feedbackRed },
  pad: { width: 80 * 3 + 16 * 2, flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  key: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
  },
  keyActive: { backgroundColor: '#E8F7FD' },
  keyText: { fontFamily: fonts.heading, fontSize: 32, color: colors.primary },
});
