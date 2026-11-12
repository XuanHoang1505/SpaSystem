import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@components/common/AppButton';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { LogOutButton } from '@features/auth/components/LogOutButton';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing, typography } from '@theme/index';

export default function StaffProfileScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <AppScreen>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>
            {(user?.fullName || 'NV').slice(0, 2).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.profileInfo}>
          <AppText accessibilityRole="header" style={styles.userName}>
            {user?.fullName ?? 'Nhân viên'}
          </AppText>
          <AppText style={styles.userEmail}>{user?.email}</AppText>
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>Kỹ thuật viên chuyên trách</AppText>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Nghiệp vụ nhân viên</AppText>
        <AppButton
          title="Lịch làm việc của tôi"
          variant="outline"
          onPress={() => router.push('/(staff)/schedule')}
        />
        <AppButton
          title="Lịch hẹn được phân công"
          variant="outline"
          onPress={() => router.push('/(staff)/bookings')}
        />
      </View>

      <View style={styles.footer}>
        <LogOutButton />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  userName: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.primary,
  },
  userEmail: {
    fontSize: typography.small,
    color: colors.muted,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: 2,
  },
  badgeText: {
    fontSize: typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
