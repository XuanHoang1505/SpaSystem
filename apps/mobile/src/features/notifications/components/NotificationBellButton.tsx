import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { AppText } from '@/components/common/AppText';
import { colors } from '@theme/index';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';
import { useNotificationRealtime } from '../hooks/useNotificationRealtime';

interface NotificationBellButtonProps {
  color?: string;
  size?: number;
}

export function NotificationBellButton({
  color = colors.text,
  size = 24,
}: NotificationBellButtonProps) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useNotificationRealtime();

  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;

  if (status !== 'authenticated') {
    return null;
  }

  const handlePress = () => {
    router.push('/notifications' as Href);
  };

  return (
    <Pressable
      accessibilityLabel={`Thông báo${unreadCount > 0 ? `, ${unreadCount} chưa đọc` : ''}`}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Bell size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pressed: {
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.accentRose,
    minWidth: 18,
    height: 18,
    borderRadius: 9999,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
