import { ActivityIndicator } from 'react-native';
import { colors } from '@theme/index';
export function AppLoader() {
  return <ActivityIndicator color={colors.primary} accessibilityLabel="Đang tải" />;
}
