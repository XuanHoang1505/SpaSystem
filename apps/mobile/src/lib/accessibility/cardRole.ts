import { Platform, type AccessibilityRole } from 'react-native';

/**
 * Role for a tappable card that also holds its own buttons ("Đặt ngay", "Chi tiết"…). On a phone the card is a button.
 * React Native Web renders that role as a real `<button>`, and HTML forbids a button inside a button, so on web the
 * card keeps no role and its inner buttons stay the accessible actions.
 */
export const containerCardRole: AccessibilityRole | undefined =
  Platform.OS === 'web' ? undefined : 'button';
