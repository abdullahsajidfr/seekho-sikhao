import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Logo, Eye, EyeOff } from '../../../components/icons';
import { logSubmit } from '../../../lib/autolog';
import { colors, fonts } from '../../../theme';

interface Props {
  /**
   * Validate the credentials. Return `{ ok: true }` on success (the caller then
   * navigates away), or `{ ok: false, error }` to show an inline message.
   */
  onSubmit: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}

export default function LoginScreen({ onSubmit }: Props) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (busy) return;
    const username = id.trim();
    if (!username || !pw.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setError('');
    setBusy(true);
    logSubmit('student:login-name', username);
    try {
      const res = await onSubmit(username, pw);
      // On success the caller navigates away and this screen unmounts; on
      // failure we stay put and surface the reason.
      if (!res.ok) setError(res.error || 'Could not sign in. Please try again.');
    } catch {
      setError('Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    // The centered card lifts above the keyboard when a field is focused.
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Logo height={72} />

        <View style={styles.headingGroup}>
          <Text style={styles.heading}>Welcome!</Text>
          <Text style={styles.sub}>Log in or sign up to start learning</Text>
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
                onChangeText={(t) => { setId(t); if (error) setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
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
                onChangeText={(t) => { setPw(t); if (error) setError(''); }}
                secureTextEntry={!showPw}
                onSubmitEditing={handleSubmit}
                editable={!busy}
              />
            </View>
            <Pressable style={styles.eyeBtn} onPress={() => setShowPw((v) => !v)} hitSlop={10}>
              {showPw ? <EyeOff width={20} height={20} color={colors.textMuted} /> : <Eye width={20} height={20} color={colors.textMuted} />}
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.loginBtn, busy && styles.loginBtnBusy]} onPress={handleSubmit} disabled={busy}>
            <Text style={styles.loginBtnText}>{busy ? 'Signing in…' : 'Log In'}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  // Fredoka label — normal proportions read clearly at a small size (Item 1).
  fieldLabel: { fontFamily: fonts.headingRegular, fontSize: 14, lineHeight: 18, color: colors.textMuted },
  // Fredoka input: caret matches glyph height, text is comfortably readable (Item 1).
  fieldInput: { fontFamily: fonts.headingRegular, fontSize: 20, lineHeight: 24, color: colors.textPrimary, padding: 0, minHeight: 30, textAlignVertical: 'center' },
  eyeBtn: { alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: fonts.headingRegular, fontSize: 16, lineHeight: 20, color: colors.feedbackRed },
  loginBtn: { marginTop: 24, height: 56, backgroundColor: colors.primary, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  loginBtnBusy: { opacity: 0.6 },
  loginBtnText: { fontFamily: fonts.heading, fontSize: 24, color: '#FFFFFF' },
});
