import Constants from 'expo-constants';
import { router } from 'expo-router';
import { KeyRound, LogOut, PencilLine, UserRound, type LucideIcon } from 'lucide-react-native';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { useLogOut } from '@features/auth/hooks/useLogOut';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, shadows, spacing } from '@theme/index';
import { ProfileMenu, type ProfileMenuSection } from '../components/ProfileMenu';
import { useMe } from '../hooks/useMe';

/** "Thành viên từ 11/2026", from the account's creation time in Vietnam. */
function memberSince(createdAtUtc: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date(createdAtUtc));
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;
  return month && year ? `Thành viên từ ${month}/${year}` : null;
}

/**
 * The signed-in Profile tab shared by the three roles: a white identity card (tap to edit), the
 * role's shortcut groups, then an "Account" group with profile, password and sign out.
 */
export function SignedInProfile({
  sections,
  badge,
  badgeIcon: BadgeIcon,
  fallbackName,
  fallbackInitials,
}: {
  sections: ProfileMenuSection[];
  badge: string;
  /** Marks the role next to the badge text. */
  badgeIcon: LucideIcon;
  fallbackName: string;
  fallbackInitials: string;
}) {
  const user = useAuthStore((state) => state.user);
  const me = useMe();
  const { pending, logOut } = useLogOut();
  const name = user?.fullName || fallbackName;
  const initials = (user?.fullName || fallbackInitials).slice(0, 2).toUpperCase();
  const since = me.data ? memberSince(me.data.createdAtUtc) : null;
  const version = Constants.expoConfig?.version;

  function confirmLogOut() {
    Alert.alert('Đăng xuất?', 'Bạn sẽ cần đăng nhập lại để đặt lịch và xem liệu trình.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => void logOut() },
    ]);
  }

  const account: ProfileMenuSection = {
    title: 'Tài khoản',
    items: [
      {
        title: 'Thông tin cá nhân',
        subtitle: 'Họ tên, ngày sinh, ảnh đại diện',
        icon: UserRound,
        onPress: () => router.push('/account'),
      },
      {
        title: 'Đổi mật khẩu',
        icon: KeyRound,
        onPress: () => router.push('/password'),
      },
      {
        title: 'Đăng xuất',
        icon: LogOut,
        tone: 'danger',
        busy: pending,
        onPress: confirmLogOut,
      },
    ],
  };

  return (
    <AppScreen scroll={false} contentContainerStyle={styles.screen}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cập nhật tài khoản"
          onPress={() => router.push('/account')}
          style={({ pressed }) => [styles.profileHeader, pressed && styles.pressed]}
        >
          {me.data?.avatarUrl ? (
            <Image
              testID="header-avatar"
              source={{ uri: me.data.avatarUrl }}
              accessible={false}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatar}>
              <AppText style={styles.avatarText}>{initials}</AppText>
            </View>
          )}
          <View style={styles.profileInfo}>
            <AppText accessibilityRole="header" style={styles.userName} numberOfLines={2}>
              {name}
            </AppText>
            <View style={styles.badge}>
              <BadgeIcon size={14} color={colors.primary} strokeWidth={2} />
              <AppText style={styles.badgeText}>{badge}</AppText>
            </View>
            {since ? <AppText style={styles.since}>{since}</AppText> : null}
          </View>
          <View style={styles.edit}>
            <PencilLine size={16} color={colors.primary} strokeWidth={2} />
          </View>
        </Pressable>

        <ProfileMenu sections={[...sections, account]} />

        <AppText style={styles.version}>
          {version ? `Như Nguyệt Spa · Phiên bản ${version}` : 'Như Nguyệt Spa'}
        </AppText>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.md },
  fill: { flex: 1 },
  scroll: { flexGrow: 1, gap: spacing.lg, paddingBottom: spacing.xl },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadows.card,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  avatarText: { color: colors.primary, fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1, gap: spacing.xs },
  userName: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: colors.text },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  badgeText: { fontSize: 13, lineHeight: 18, color: colors.primary, fontWeight: '600' },
  since: { fontSize: 12, color: colors.muted },
  edit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  version: {
    marginTop: 'auto',
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
  },
});
