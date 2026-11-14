/**
 * Botanical green palette (trial, 14/11/2026), tuned for contrast: white on `primary` 6.3:1, `text` on `background`
 * 14:1, `muted` on `background` 5.5:1. Green is the brand on mobile only for now; the web and DESIGN.md still use
 * the mauve palette.
 */
export const colors = {
  /** Main buttons, active tab, links. */
  primary: '#2F6B45',
  /** Pressed state and dark accents (price, small headings). */
  primaryPressed: '#1E4D2B',
  /** A light tint of primary: icon wells, chips, highlight cards, role badge. */
  primarySoft: '#DCEEE0',
  /** Soft sage for pills and decorative washes. */
  secondary: '#CBE3CE',
  /** Leaf greens for icons and illustrations, never for body text. */
  leaf: '#4E8759',
  leafLight: '#85B78D',
  background: '#F3F6F1',
  surface: '#F9FCF8',
  /** Pure white for a raised card on the background. */
  card: '#FFFFFF',
  text: '#16261A',
  muted: '#4F6654',
  /** The one warm accent: ratings, "offer" and "best seller" tags. Text on it uses `text`. */
  accentGold: '#D99B26',
  /** Gold as text on white or the background (5.5:1). */
  accentGoldText: '#8A6116',
  /**
   * The warm promo accent, kin to the web's mauve brand: solid pills with white text (4.7:1) for "save X%", "offer",
   * "best seller" and the cart count. Not for errors, which keep `error`.
   */
  accentRose: '#B4566F',
  /** Soft rose pill on white cards, with `accentRoseText` (5.7:1). */
  accentRoseSoft: '#F8E1E7',
  accentRoseText: '#8C3F55',
  /**
   * Status tones (as DESIGN.md `status-*`): a soft fill, a border, and the strong colour for text and icons on it
   * (5.1–6.4:1).
   */
  success: '#386647',
  successSoft: '#E3EFE5',
  successBorder: '#C7DECB',
  warningSoft: '#F7ECD9',
  warningBorder: '#EAD3A8',
  info: '#2F5677',
  infoSoft: '#E2EBF3',
  infoBorder: '#C9D9E8',
  errorSoft: '#F8E3E5',
  errorBorder: '#EFC5CA',
  neutralSoft: '#EEF1EC',
  warning: '#835c22',
  error: '#a23846',
  border: '#CFE0D1',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(22, 38, 26, 0.45)',
} as const;
