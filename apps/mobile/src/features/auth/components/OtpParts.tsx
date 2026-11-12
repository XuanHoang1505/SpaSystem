import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { AppInput } from '@components/common/AppInput';
import { AppText } from '@components/common/AppText';
import { AppTextButton } from '@components/common/AppTextButton';
import { colors, spacing, typography } from '@theme/index';
import { useCountdown } from '../hooks/useCountdown';

/**
 * The 6-digit code. Non-digits are dropped as they arrive, so a pasted "123 456" works; there is no `maxLength`,
 * which would cut the paste before the filter runs.
 */
export function OtpInput({
  onChangeText,
  ...props
}: Omit<ComponentProps<typeof AppInput>, 'label'> & { label?: string }) {
  return (
    <AppInput
      label="Mã OTP"
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      placeholder="000000"
      style={styles.otp}
      {...props}
      onChangeText={(text) => onChangeText?.(text.replace(/\D/g, '').slice(0, 6))}
    />
  );
}

const mmss = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/** "Mã hết hạn sau mm:ss" from the server's `expiresAtUtc`; only the expiry itself is announced. */
export function OtpExpiry({ expiresAtUtc }: { expiresAtUtc: string }) {
  const seconds = useCountdown(expiresAtUtc);
  const expired = seconds === 0;
  return (
    <View style={styles.row}>
      <Clock color={expired ? colors.error : colors.muted} size={14} />
      <AppText
        accessibilityLiveRegion={expired ? 'polite' : 'none'}
        style={[styles.small, expired && styles.expired]}
      >
        {expired ? 'Mã đã hết hạn. Vui lòng gửi lại mã.' : `Mã hết hạn sau ${mmss(seconds)}`}
      </AppText>
    </View>
  );
}

/** Disabled until the server's `resendAvailableAtUtc` (BR-AUTH-25); the wait is never hard-coded here. */
export function ResendCodeButton({
  availableAtUtc,
  onResend,
  loading = false,
}: {
  availableAtUtc: string | null;
  onResend: () => void;
  loading?: boolean;
}) {
  const seconds = useCountdown(availableAtUtc);
  return (
    <AppTextButton
      title={seconds > 0 ? `Gửi lại mã sau ${seconds} giây` : loading ? 'Đang gửi…' : 'Gửi lại mã'}
      onPress={onResend}
      disabled={seconds > 0 || loading}
    />
  );
}

/** "Bước x/y · …" with one segment per step (SCR-M08). */
export function StepProgress({
  step,
  total,
  label,
}: {
  step: number;
  total: number;
  label: string;
}) {
  return (
    <View
      style={styles.progress}
      accessible
      accessibilityLabel={`Bước ${step}/${total}, ${label}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step }}
    >
      <AppText style={styles.small}>{`Bước ${step}/${total} · ${label}`}</AppText>
      <View style={styles.segments}>
        {Array.from({ length: total }, (_, index) => (
          <View key={index} style={[styles.segment, index < step && styles.segmentDone]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  otp: { textAlign: 'center', fontSize: typography.heading, letterSpacing: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  small: { color: colors.muted, fontSize: typography.small },
  expired: { color: colors.error },
  progress: { gap: spacing.sm },
  segments: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  segmentDone: { backgroundColor: colors.primary },
});
