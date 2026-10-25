import { Stack } from 'expo-router';
import { colors } from '@theme/index';
export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="services/index" options={{ title: 'Dịch vụ' }} />
      <Stack.Screen name="services/[serviceId]" options={{ title: 'Chi tiết dịch vụ' }} />
      <Stack.Screen name="packages/index" options={{ title: 'Gói chăm sóc' }} />
      <Stack.Screen name="packages/[packageId]" options={{ title: 'Chi tiết gói' }} />
      <Stack.Screen name="login" options={{ title: 'Đăng nhập' }} />
      <Stack.Screen name="register" options={{ title: 'Đăng ký' }} />
    </Stack>
  );
}
