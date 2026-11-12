import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@theme/index';

export const customerTabs = [
  ['home', 'Trang chủ'],
  ['bookings', 'Lịch hẹn'],
  ['treatments', 'Liệu trình'],
  ['packages', 'Gói của tôi'],
  ['profile', 'Tài khoản'],
] as const;

export const staffTabs = [
  ['dashboard', 'Tổng quan'],
  ['schedule', 'Lịch làm việc'],
  ['bookings', 'Lịch hẹn'],
  ['profile', 'Cá nhân'],
] as const;

export const ownerTabs = [
  ['dashboard', 'Tổng quan'],
  ['bookings', 'Lịch hẹn'],
  ['reports', 'Báo cáo'],
  ['staff', 'Nhân sự'],
  ['profile', 'Cá nhân'],
] as const;

export const staffScreens = [
  ['dashboard', 'Tổng quan'],
  ['schedule', 'Lịch làm việc'],
  ['bookings/index', 'Lịch hẹn'],
  ['bookings/[bookingId]', 'Buổi chăm sóc'],
] as const;

export const ownerScreens = [
  ['dashboard', 'Tổng quan'],
  ['services', 'Dịch vụ'],
  ['staff', 'Nhân viên'],
  ['bookings', 'Lịch hẹn'],
  ['reports', 'Báo cáo'],
] as const;

/**
 * Standard bottom navigation options for Expo Router Tabs:
 * - Increases height for comfortable touch targets (>= 48dp).
 * - Dynamically pads for iOS Home indicator & Android system navigation bars.
 * - Standardizes brand colors, typography and icon spacing.
 */
export function useCommonTabScreenOptions() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;
  const tabHeight = (Platform.OS === 'ios' ? 56 : 64) + bottomPadding;

  return {
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: tabHeight,
      paddingTop: 8,
      paddingBottom: bottomPadding,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '600' as const,
      marginTop: 2,
    },
    tabBarIconStyle: {
      marginTop: 2,
    },
    tabBarItemStyle: {
      paddingVertical: 2,
    },
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.primary,
    headerTitleStyle: {
      fontWeight: '700' as const,
    },
  };
}
