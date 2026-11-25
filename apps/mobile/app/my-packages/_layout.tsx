import { Stack } from 'expo-router';
import { CustomerRoute } from '@components/auth/CustomerRoute';

export default function MyPackagesLayout() {
  return (
    <CustomerRoute pathParams={['packageId']}>
      <Stack screenOptions={{ headerShown: false }} />
    </CustomerRoute>
  );
}
