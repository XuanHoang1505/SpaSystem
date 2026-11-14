import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { colors } from '@theme/index';

export function HoldCountdownBadge({
  holdExpiresAtUtc,
  onExpired,
}: {
  holdExpiresAtUtc: string;
  onExpired?: () => void;
}) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const diff = Math.floor((new Date(holdExpiresAtUtc).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  // Read the latest callback without restarting the timer: a new inline function on every render must not re-run
  // the effect, or an expired hold would call onExpired (a refetch) again on each render.
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    const targetMs = new Date(holdExpiresAtUtc).getTime();
    let fired = false;
    const update = () => {
      const diff = Math.floor((targetMs - Date.now()) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        // Once per hold deadline.
        if (!fired) {
          fired = true;
          onExpiredRef.current?.();
        }
        return false;
      }
      setRemainingSeconds(diff);
      return true;
    };

    if (!update()) return;

    const timer = setInterval(() => {
      if (!update()) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [holdExpiresAtUtc]);

  const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const secs = String(remainingSeconds % 60).padStart(2, '0');

  return (
    <View style={styles.container}>
      <Clock size={13} color={colors.warning} />
      <AppText style={styles.text}>
        {remainingSeconds > 0 ? `Giữ chỗ còn ${mins}:${secs}` : 'Đã hết thời gian giữ chỗ'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
});
