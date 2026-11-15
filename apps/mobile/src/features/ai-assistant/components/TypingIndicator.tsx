import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Bot } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing } from '@theme/index';

export function TypingIndicator() {
  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel="Trợ lý đang trả lời">
      <View style={styles.avatar}>
        <Bot size={16} color={colors.primary} />
      </View>
      <View style={styles.bubble}>
        <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
        <AppText style={styles.text}>Trợ lý đang tra cứu thông tin...</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  spinner: {
    marginRight: 2,
  },
  text: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
  },
});
