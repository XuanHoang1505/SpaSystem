import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@components/common/AppButton';
import { AppCard } from '@components/common/AppCard';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { LogOutButton } from '@features/auth/components/LogOutButton';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing, typography } from '@theme/index';

export default function CustomerProfileScreen() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === 'anonymous' || !user) {
    return (
      <AppScreen>
        <AppText style={styles.brand}>NHƯ NGUYỆT SPA</AppText>
        <AppText accessibilityRole="header" style={styles.title}>
          Tài khoản
        </AppText>
        <AppText style={styles.subtitle}>
          Đăng nhập hoặc đăng ký để quản lý lịch hẹn, theo dõi liệu trình và tích lũy ưu đãi thành viên.
        </AppText>

        <AppCard>
          <AppText style={styles.cardTitle}>Chào mừng quý khách</AppText>
          <AppText style={styles.cardDesc}>
            Trải nghiệm dịch vụ chăm sóc da chuyên sâu cùng đội ngũ chuyên gia da liễu hàng đầu.
          </AppText>
          <AppButton
            title="Đăng nhập"
            onPress={() => router.push('/(public)/login')}
          />
          <AppButton
            title="Đăng ký tài khoản"
            variant="outline"
            onPress={() => router.push('/(public)/register')}
          />
        </AppCard>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Khám phá & Hỗ trợ</AppText>
          <AppButton
            title="Khám phá dịch vụ spa"
            variant="outline"
            onPress={() => router.push('/(public)/services')}
          />
          <AppButton
            title="Gói liệu trình ưu đãi"
            variant="outline"
            onPress={() => router.push('/(public)/packages')}
          />
          <AppButton
            title="Trợ lý AI tư vấn da"
            variant="outline"
            onPress={() => router.push('/(customer)/ai-assistant')}
          />
        </View>
      </AppScreen>
    );
  }

  // Khách hàng đã đăng nhập
  return (
    <AppScreen>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>
            {(user.fullName || 'KH').slice(0, 2).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.profileInfo}>
          <AppText accessibilityRole="header" style={styles.userName}>
            {user.fullName}
          </AppText>
          <AppText style={styles.userEmail}>{user.email}</AppText>
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>Khách hàng thành viên</AppText>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Hoạt động của tôi</AppText>
        <AppButton
          title="Lịch hẹn của tôi"
          variant="outline"
          onPress={() => router.push('/(customer)/bookings')}
        />
        <AppButton
          title="Liệu trình chăm sóc da"
          variant="outline"
          onPress={() => router.push('/(customer)/treatments')}
        />
        <AppButton
          title="Gói dịch vụ đã mua"
          variant="outline"
          onPress={() => router.push('/(customer)/packages')}
        />
        <AppButton
          title="Trợ lý AI tư vấn da"
          variant="outline"
          onPress={() => router.push('/(customer)/ai-assistant')}
        />
        <AppButton
          title="Đánh giá dịch vụ"
          variant="outline"
          onPress={() => router.push('/(customer)/reviews')}
        />
      </View>

      <View style={styles.footer}>
        <LogOutButton />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: colors.primary,
    fontSize: typography.small,
    letterSpacing: 2,
    marginTop: spacing.md,
  },
  title: {
    fontSize: typography.hero,
    lineHeight: 40,
    color: colors.primary,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.primary,
  },
  cardDesc: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 20,
  },
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
