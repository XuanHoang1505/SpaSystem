import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  CalendarCheck,
  Gift,
  KeyRound,
  LogIn,
  MessageCircle,
  Package,
  Sparkles,
  Star,
  UserPlus,
  UserRound,
  UserStar,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, shadows, spacing } from '@theme/index';
import { ProfileMenu, type ProfileMenuSection } from '../components/ProfileMenu';
import { SignedInProfile } from './SignedInProfile';

const PERKS = [
  {
    icon: CalendarCheck,
    title: 'Đặt lịch chủ động',
    desc: 'Chọn khung giờ Sáng/Chiều & KTV yêu thích',
  },
  {
    icon: Sparkles,
    title: 'Theo dõi liệu trình',
    desc: 'Quản lý số buổi còn lại và lịch sử chăm sóc',
  },
  {
    icon: Gift,
    title: 'Ưu đãi thành viên',
    desc: 'Áp mã giảm giá & mua gói tiết kiệm đến 30%',
  },
] as const;

export function CustomerProfileScreen() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const version = Constants.expoConfig?.version;

  if (status === 'anonymous' || !user) {
    const guestSections: ProfileMenuSection[] = [
      {
        title: 'Khám phá dịch vụ',
        items: [
          {
            title: 'Khám phá dịch vụ spa',
            subtitle: 'Chăm sóc da mặt, massage trị liệu, gội đầu dưỡng sinh',
            icon: Sparkles,
            onPress: () => router.push('/(public)/services'),
          },
          {
            title: 'Gói liệu trình ưu đãi',
            subtitle: 'Tiết kiệm chi phí với các gói chăm sóc nhiều buổi',
            icon: Package,
            onPress: () => router.push('/(public)/packages'),
          },
          {
            title: 'Đặt lịch hẹn chăm sóc',
            subtitle: 'Đăng nhập để giữ chỗ và chọn kỹ thuật viên',
            icon: CalendarCheck,
            onPress: () =>
              router.push(
                `/(public)/login?redirect=${encodeURIComponent('/(public)/services')}`,
              ),
          },
        ],
      },
      {
        title: 'Tư vấn & Hỗ trợ',
        items: [
          {
            title: 'Trợ lý AI tư vấn da',
            subtitle: 'Gợi ý liệu trình phù hợp theo tình trạng da',
            icon: MessageCircle,
            onPress: () => router.push('/(customer)/ai-assistant'),
          },
          {
            title: 'Quên mật khẩu?',
            subtitle: 'Khôi phục mật khẩu nhanh qua mã OTP email',
            icon: KeyRound,
            onPress: () => router.push('/(public)/forgot-password'),
          },
        ],
      },
    ];

    return (
      <AppScreen scroll={false} contentContainerStyle={styles.screen}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Guest Hero Membership Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.avatarCircle}>
                <UserRound size={28} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.heroTitleCol}>
                <AppText accessibilityRole="header" style={styles.heroTitle}>
                  Chào mừng quý khách
                </AppText>
                <AppText style={styles.heroSubtitle}>
                  Đăng nhập hoặc tạo tài khoản thành viên để trải nghiệm trọn vẹn dịch vụ tại Như Nguyệt Spa.
                </AppText>
              </View>
            </View>

            {/* Membership Perks */}
            <View style={styles.perksBox}>
              {PERKS.map((perk) => {
                const PerkIcon = perk.icon;
                return (
                  <View key={perk.title} style={styles.perkRow}>
                    <View style={styles.perkIconWrap}>
                      <PerkIcon size={15} color={colors.primary} />
                    </View>
                    <View style={styles.perkTextCol}>
                      <AppText style={styles.perkTitle}>{perk.title}</AppText>
                      <AppText style={styles.perkDesc}>{perk.desc}</AppText>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Primary Auth CTAs */}
            <View style={styles.authButtonsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đăng nhập"
                onPress={() => router.push('/(public)/login')}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <LogIn size={16} color={colors.onPrimary} />
                <AppText style={styles.primaryBtnText}>Đăng nhập</AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đăng ký"
                onPress={() => router.push('/(public)/register')}
                style={({ pressed }) => [
                  styles.outlineBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <UserPlus size={16} color={colors.primary} />
                <AppText style={styles.outlineBtnText}>
                  Đăng ký tài khoản
                </AppText>
              </Pressable>
            </View>
          </View>

          {/* Shortcut Menu Groups */}
          <ProfileMenu sections={guestSections} />

          <AppText style={styles.version}>
            {version
              ? `Như Nguyệt Spa · Phiên bản ${version}`
              : 'Như Nguyệt Spa'}
          </AppText>
        </ScrollView>
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
  screen: {
    paddingHorizontal: spacing.md,
  },
  fill: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleCol: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 26,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  perksBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  perkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkTextCol: {
    flex: 1,
    gap: 1,
  },
  perkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  perkDesc: {
    fontSize: 12,
    color: colors.muted,
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: spacing.md,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  outlineBtn: {
    flex: 1.15,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: spacing.md,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  btnPressed: {
    opacity: 0.85,
  },
  version: {
    marginTop: 'auto',
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
  },
});
