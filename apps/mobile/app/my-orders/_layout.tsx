import { Stack } from 'expo-router';
import { CustomerRoute } from '@components/auth/CustomerRoute';
import { colors } from '@theme/index';

/** Orders belong to customers: guarded like the `(customer)` group although they live on the root stack. */
export default function MyOrdersLayout() {
  return (
    <CustomerRoute pathParams={['orderId']}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="[orderId]" />
      </Stack>
    </CustomerRoute>
  );
}
