import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colors } from '@theme/index';
import { Inbox } from 'lucide-react-native';

export interface EmptyStateProps {
  icon?: ComponentType<{ size?: number; color?: string }>;
  title?: string;
  description?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Chưa có dữ liệu',
  description = 'Nội dung sẽ xuất hiện khi có dữ liệu mới.',
  action,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Icon size={32} color={colors.primary} />
      </View>
      <AppText accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {description ? <AppText style={styles.description}>{description}</AppText> : null}
      {action ? <View style={styles.actionWrap}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 290,
  },
  actionWrap: {
    marginTop: 18,
    minWidth: 160,
  },
});
