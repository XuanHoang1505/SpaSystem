import { Stack } from 'expo-router';
import { CartBadgeButton } from '@/features/orders';
import { colors } from '@theme/index';

// The navigation bar names each screen once. The sign-in screens draw their own large heading, so their bar keeps
// only the back button (empty headerTitle) instead of repeating it.
const cartButton = () => <CartBadgeButton />;

export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="services/index" options={{ title: 'Dịch vụ', headerRight: cartButton }} />
      <Stack.Screen name="services/[serviceId]" options={{ title: 'Chi tiết dịch vụ' }} />
      <Stack.Screen
        name="packages/index"
        options={{ title: 'Gói chăm sóc', headerRight: cartButton }}
      />
      <Stack.Screen name="packages/[packageId]" options={{ title: 'Chi tiết gói' }} />
      <Stack.Screen name="login" options={{ title: 'Đăng nhập', headerTitle: '' }} />
      <Stack.Screen name="register" options={{ title: 'Đăng ký', headerTitle: '' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Quên mật khẩu', headerTitle: '' }} />
    </Stack>
  );
}
