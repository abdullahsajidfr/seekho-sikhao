/**
 * Design tokens ported 1:1 from the web build's global.css / CSS modules.
 * Colours, type scale and spacing match the Figma-aligned student surface.
 */

export const colors = {
  primary: '#2ABAF2',
  accent: '#0C759E',
  bg1: '#FFFBF7', // cream page background
  bgChat: '#FFFAF4',
  bg2: '#FFFFFF',
  userBubble: '#F5F5F5',
  aiBubble: '#FFFFFF',
  feedbackGreen: '#2AF28B',
  feedbackRed: '#F45858',
  textPrimary: '#1A1A1A',
  textMuted: '#444444',
  textMuted2: '#A1A1A1',
  border: '#D1E8DC',
  topBar: 'rgba(42, 186, 242, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.45)',
  cardDark: '#1C1C1E',
};

// @expo-google-fonts family keys (see App.tsx useFonts)
export const fonts = {
  heading: 'Fredoka_500Medium',
  headingRegular: 'Fredoka_400Regular',
  body: 'Dongle_400Regular',
  urdu: 'NotoNastaliqUrdu_400Regular',
};

export const radius = {
  card: 16,
  pill: 999,
  modal: 20,
  input: 12,
};

// iPad landscape reference frame the surface was designed against.
export const DESIGN = { width: 1194, height: 834 };

// Detect Urdu (Arabic script) so read-aloud can pick the right locale.
export const hasUrdu = (s: string) => /[؀-ۿݐ-ݿ]/.test(s);
