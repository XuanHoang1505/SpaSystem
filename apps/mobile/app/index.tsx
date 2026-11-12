import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AppLoader } from '@components/common/AppLoader';
import { homePathFor, useAuthStore } from '@/stores/authStore';
import { colors } from '@theme/index';

/**
 * Root entry point:
 * - When restoring: shows loading spinner.
 * - When authenticated: auto-redirects to designated workspace according to role.
 * - When anonymous: defaults to the Customer workspace with full Bottom Navigation.
 */
export default function IndexScreen() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === 'restoring') {
    return (
      <View style={styles.center}>
        <AppLoader />
      </View>
    );
  }

  if (status === 'authenticated' && user) {
    return <Redirect href={homePathFor(user.role)} />;
  }

  return <Redirect href="/(customer)/home" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
