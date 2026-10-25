import { StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { colors } from '@theme/index';
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <AppCard>
      <AppText accessibilityRole="alert" style={styles.text}>
        {message}
      </AppText>
      {onRetry && <AppButton title="Thử lại" onPress={onRetry} />}
    </AppCard>
  );
}
const styles = StyleSheet.create({ text: { color: colors.error } });
