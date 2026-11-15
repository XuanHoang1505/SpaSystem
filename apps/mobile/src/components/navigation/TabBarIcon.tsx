import type { ComponentType } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { colors } from '@/theme/colors';

export interface TabBarIconProps {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  focused: boolean;
  color: ColorValue;
  size?: number;
}

/**
 * Standard tab bar icon with active pill indicator:
 * - Active: Soft brand pill background (primarySoft), deep dark green (primaryPressed), bolder stroke.
 * - Inactive: Transparent background, muted sage gray color, standard stroke.
 */
export function TabBarIcon({ icon: Icon, focused, color, size = 20 }: TabBarIconProps) {
  const iconColor = focused
    ? colors.primaryPressed
    : typeof color === 'string'
      ? color
      : colors.tabBarInactive;

  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <Icon
        size={size}
        color={iconColor}
        strokeWidth={focused ? 2.4 : 1.9}
      />
    </View>
  );
}

/**
 * Convenience helper for `tabBarIcon` option in Expo Router `Tabs.Screen`.
 */
export function tabIcon(Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <TabBarIcon icon={Icon} color={color} size={size} focused={focused} />
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 46,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: colors.primarySoft,
  },
});
