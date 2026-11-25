import { Stack } from 'expo-router';
import { CustomerRoute } from '@components/auth/CustomerRoute';

/** The booking screens live on the root stack but belong to customers: guard them like the `(customer)` group. */
export default function BookingLayout() {
  return (
    <CustomerRoute pathParams={['bookingId']}>
      <Stack screenOptions={{ headerShown: false }} />
    </CustomerRoute>
  );
}
