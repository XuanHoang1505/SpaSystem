import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleAlert, CircleCheck, Info, type LucideIcon } from 'lucide-react-native';
import { useToastStore, type ToastTone } from '@/stores/toastStore';
import { colors, radius, shadows, spacing, typography } from '@theme/index';
import { AppText } from './AppText';

/** Errors stay longer so there is time to read what to fix. */
export const toastDurationMs: Record<ToastTone, number> = {
  success: 3000,
  info: 3000,
  error: 5000,
};

const toneStyle: Record<ToastTone, { color: string; Icon: LucideIcon }> = {
  success: { color: colors.success, Icon: CircleCheck },
  error: { color: colors.error, Icon: CircleAlert },
  info: { color: colors.primary, Icon: Info },
};

/** Fades the toast out, then hides that toast only (a newer one shown meanwhile stays). */
function slideOut(progress: Animated.Value, id: number) {
  Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
    useToastStore.getState().hide(id),
  );
}

/**
 * Shows the current toast at the top, under the status bar: slides in, hides itself after `toastDurationMs`, and
 * closes on tap. Render once, after the navigator, so it sits above every screen.
 */
export function AppToastHost() {
  const current = useToastStore((state) => state.current);
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    AccessibilityInfo.announceForAccessibility(current.message);
    const timer = setTimeout(() => slideOut(progress, current.id), toastDurationMs[current.tone]);
    return () => clearTimeout(timer);
  }, [current, progress]);

  if (!current) return null;
  const { color, Icon } = toneStyle[current.tone];

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
      <Animated.View
        style={{
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
          ],
        }}
      >
        <Pressable
          testID="toast"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityHint="Chạm để đóng"
          onPress={() => slideOut(progress, current.id)}
          style={styles.toast}
        >
          <Icon size={20} color={color} strokeWidth={2} />
          <AppText style={styles.message}>{current.message}</AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    maxWidth: 480,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
    elevation: 6,
    shadowOpacity: 0.12,
  },
  message: { flexShrink: 1, color: colors.text, fontSize: typography.small, lineHeight: 20 },
});
