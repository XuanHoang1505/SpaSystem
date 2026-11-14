import type { PropsWithChildren } from 'react';
import { Redirect, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { UserRole } from '@spa/shared-types';
import { AppLoader } from '@components/common/AppLoader';
import { canAccessRole, useAuthStore } from '@/stores/authStore';
import { colors } from '@theme/index';

/**
 * Guards one role group (`(customer)`, `(staff)`, `(owner)`). Experience only, not a security boundary: the API
 * checks every permission. A route outside the role's group (such as `/booking/*`) passes `redirect`, the full path
 * and query to come back to after signing in.
 */
export function RouteGuard({
  role,
  redirect,
  children,
}: PropsWithChildren<{ role: UserRole; redirect?: string }>) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();

  if (status === 'restoring')
    return (
      <View style={styles.center}>
        <AppLoader />
      </View>
    );
  if (status === 'anonymous')
    return (
      <Redirect
        href={{
          pathname: '/(public)/login',
          params: { redirect: redirect ?? `/(${role})${pathname}` },
        }}
      />
    );
  if (!canAccessRole(user, role)) return <Redirect href="/forbidden" />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
