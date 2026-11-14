import { Stack } from 'expo-router';
import { colors } from '@theme/index';

export default function MyOrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[orderId]" />
    </Stack>
  );
}
