import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/common/AppText';
import { colors } from '@theme/index';
import {
  mobileNotificationTypeIcons,
  mobileNotificationTypeLabels,
  mobileNotificationTypeColors,
  formatRelativeTime,
} from '../types';
import type { NotificationDto } from '@spa/shared-types';

interface NotificationCardProps {
  item: NotificationDto;
  onPress: (item: NotificationDto) => void;
}

export function NotificationCard({ item, onPress }: NotificationCardProps) {
  const Icon = mobileNotificationTypeIcons[item.type] || mobileNotificationTypeIcons.system;
  const label = mobileNotificationTypeLabels[item.type] || 'Hệ thống';
  const colorScheme = mobileNotificationTypeColors[item.type] || mobileNotificationTypeColors.system;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${label}, ${item.isRead ? 'Đã đọc' : 'Chưa đọc'}`}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.card,
        !item.isRead && styles.unreadCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colorScheme.bg }]}>
        <Icon size={20} color={colorScheme.icon} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <AppText style={[styles.typeBadge, { color: colorScheme.icon }]}>
            {label}
          </AppText>
          <AppText style={styles.timeText}>
            {formatRelativeTime(item.createdAtUtc)}
          </AppText>
        </View>

        <AppText
          style={[styles.title, !item.isRead && styles.unreadTitle]}
          numberOfLines={2}
        >
          {item.title}
        </AppText>

        <AppText style={styles.body} numberOfLines={3}>
          {item.body}
        </AppText>
      </View>

      {!item.isRead && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 64,
  },
  unreadCard: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.85,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeBadge: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    color: colors.muted,
  },
  title: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 19,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#0F2414',
  },
  body: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
});
