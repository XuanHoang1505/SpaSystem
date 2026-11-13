import { router } from 'expo-router';
import {
  CalendarCheck,
  MessageCircle,
  Package,
  Star,
  UserStar,
  Sparkles,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@components/common/AppButton';
import { AppCard } from '@components/common/AppCard';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typography } from '@theme/index';
import { SignedInProfile } from './SignedInProfile';

export function CustomerProfileScreen() {
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
          Đăng nhập hoặc đăng ký để quản lý lịch hẹn, theo dõi liệu trình và tích lũy ưu đãi thành
          viên.
        </AppText>

        <AppCard>
          <AppText style={styles.cardTitle}>Chào mừng quý khách</AppText>
          <AppText style={styles.cardDesc}>
            Trải nghiệm dịch vụ chăm sóc da chuyên sâu cùng đội ngũ chuyên gia da liễu hàng đầu.
          </AppText>
          <AppButton title="Đăng nhập" onPress={() => router.push('/(public)/login')} />
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

  return (
    <SignedInProfile
      badge="Khách hàng thành viên"
      badgeIcon={UserStar}
      fallbackName="Khách hàng"
      fallbackInitials="KH"
      sections={[
        {
          title: 'Dịch vụ của tôi',
          items: [
            {
              title: 'Lịch hẹn của tôi',
              subtitle: 'Xem, dời giờ và hủy buổi đã đặt',
              icon: CalendarCheck,
              onPress: () => router.push('/(customer)/bookings'),
            },
            {
              title: 'Liệu trình chăm sóc da',
              subtitle: 'Tiến độ từng buổi trong gói',
              icon: Sparkles,
              onPress: () => router.push('/(customer)/treatments'),
            },
            {
              title: 'Gói dịch vụ đã mua',
              subtitle: 'Dịch vụ và gói còn hiệu lực',
              icon: Package,
              onPress: () => router.push('/(customer)/packages'),
            },
          ],
        },
        {
          title: 'Hỗ trợ',
          items: [
            {
              title: 'Trợ lý AI tư vấn da',
              subtitle: 'Gợi ý dịch vụ, không chẩn đoán',
              icon: MessageCircle,
              onPress: () => router.push('/(customer)/ai-assistant'),
            },
            {
              title: 'Đánh giá dịch vụ',
              subtitle: 'Nhận xét sau buổi chăm sóc',
              icon: Star,
              onPress: () => router.push('/(customer)/reviews'),
              soon: true,
            },
          ],
        },
      ]}
    />
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
});
