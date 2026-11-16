import React from 'react';
import { Platform, Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@theme/index';
export { TabBarIcon, tabIcon } from '@/components/navigation/TabBarIcon';

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
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = (Platform.OS === 'ios' ? 58 : 64) + bottomPadding;

  return {
    tabBarActiveTintColor: colors.primaryPressed,
    tabBarInactiveTintColor: colors.tabBarInactive,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: tabHeight,
      paddingTop: 6,
      paddingBottom: bottomPadding,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    tabBarLabel: ({
      focused,
      color,
      children,
    }: {
      focused: boolean;
      color: ColorValue;
      position: unknown;
      children: string;
    }) =>
      React.createElement(
        Text,
        {
          numberOfLines: 1,
          style: {
            color: focused ? colors.primaryPressed : color,
            fontSize: 11,
            fontWeight: focused ? '700' : '500',
            marginTop: 2,
          },
        },
        children,
      ),
    tabBarIconStyle: {
      marginTop: 0,
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
