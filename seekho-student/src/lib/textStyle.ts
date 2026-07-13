import type { TextStyle } from 'react-native';
import { fonts, hasUrdu } from '../theme';

/**
 * Nastaliq (Urdu script) is far taller than the Latin display fonts used across
 * the app (Quicksand / Fredoka). When Urdu text is rendered with the Latin font and
 * a tight lineHeight it clips badly. This helper detects Urdu script in a string
 * and, only then, layers on the Urdu-safe overrides: the Nastaliq family, a
 * generous lineHeight (~1.8× the base font size), right alignment + RTL writing
 * direction, and a little vertical breathing room so nothing is cut off.
 *
 * Latin / Roman-Urdu strings are returned untouched so the existing look is
 * preserved. Apply this everywhere a message can contain Urdu (chat bubbles,
 * the workbook question, the input field).
 */
const URDU_LINE_HEIGHT_RATIO = 1.85;

export function urduAwareTextStyle(
  text: string | null | undefined,
  baseStyle: TextStyle,
): TextStyle | TextStyle[] {
  if (!text || !hasUrdu(text)) return baseStyle;

  const fontSize = typeof baseStyle.fontSize === 'number' ? baseStyle.fontSize : 24;
  const urduOverrides: TextStyle = {
    fontFamily: fonts.urdu,
    lineHeight: Math.round(fontSize * URDU_LINE_HEIGHT_RATIO),
    textAlign: 'right',
    writingDirection: 'rtl',
    // Nastaliq's tall ascenders / low descenders need extra room top & bottom.
    paddingVertical: Math.max(4, Math.round(fontSize * 0.14)),
  };
  return [baseStyle, urduOverrides];
}
