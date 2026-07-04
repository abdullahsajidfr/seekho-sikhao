import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Logo, Eye, EyeOff } from '../../../components/icons';
import { colors, fonts } from '../../../theme';

interface Props {
  onLogin: (studentId: string) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  function handleSubmit() {
    if (id.trim() && pw.trim()) onLogin(id.trim());
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Logo height={72} />

        <View style={styles.headingGroup}>
          <Text style={styles.heading}>Welcome back!</Text>
          <Text style={styles.sub}>Log in to continue learning</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Type Here"
                placeholderTextColor={colors.textMuted2}
                value={id}
                onChangeText={setId}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Type Here"
                placeholderTextColor={colors.textMuted2}
                value={pw}
                onChangeText={setPw}
                secureTextEntry={!showPw}
                onSubmitEditing={handleSubmit}
              />
            </View>
            <Pressable style={styles.eyeBtn} onPress={() => setShowPw((v) => !v)} hitSlop={10}>
              {showPw ? <EyeOff width={20} height={20} color={colors.textMuted} /> : <Eye width={20} height={20} color={colors.textMuted} />}
            </Pressable>
          </View>

          <Pressable style={styles.loginBtn} onPress={handleSubmit}>
            <Text style={styles.loginBtnText}>Log In</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg1, alignItems: 'center', justifyContent: 'center' },
  card: {
    width: 620,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 62,
    alignItems: 'center',
    gap: 40,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headingGroup: { alignSelf: 'stretch', alignItems: 'flex-start' },
  heading: { fontFamily: fonts.heading, fontSize: 52, lineHeight: 66, color: colors.textPrimary },
  sub: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 33, color: colors.textMuted2 },
  form: { alignSelf: 'stretch', gap: 16 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.textMuted,
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  fieldContent: { flex: 1, gap: 2 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 24, lineHeight: 26, color: colors.textMuted },
  fieldInput: { fontFamily: fonts.body, fontSize: 24, lineHeight: 26, color: colors.textPrimary, padding: 0, minHeight: 28 },
  eyeBtn: { alignItems: 'center', justifyContent: 'center' },
  loginBtn: { marginTop: 24, height: 56, backgroundColor: colors.primary, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { fontFamily: fonts.heading, fontSize: 24, color: '#FFFFFF' },
});
