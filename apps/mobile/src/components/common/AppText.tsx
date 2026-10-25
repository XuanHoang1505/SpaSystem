import { Text, StyleSheet, type TextProps } from 'react-native';
import { colors, typography } from '@theme/index';
export function AppText({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.text, style]} />;
}
const styles = StyleSheet.create({
  text: { fontSize: typography.body, color: colors.text, lineHeight: 25 },
});
