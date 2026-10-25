import { StyleSheet } from 'react-native';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { colors, typography } from '@theme/index';
export function SystemStatus() {
  const status = useSystemStatus();
  const text = status.configurationError
    ? `Configuration Error · ${status.configurationError}`
    : status.isPending
      ? 'Loading · Đang kiểm tra API…'
      : status.isError
        ? 'API Offline · Chưa kết nối được máy chủ'
        : 'API Online · Hệ thống hoạt động';
  return (
    <AppCard>
      <AppText
        accessibilityLiveRegion="polite"
        style={[
          styles.text,
          status.configurationError || status.isError
            ? styles.error
            : status.isPending
              ? styles.loading
              : styles.online,
        ]}
      >
        {text}
      </AppText>
    </AppCard>
  );
}
const styles = StyleSheet.create({
  text: { fontSize: typography.small },
  online: { color: colors.success },
  error: { color: colors.error },
  loading: { color: colors.warning },
});
