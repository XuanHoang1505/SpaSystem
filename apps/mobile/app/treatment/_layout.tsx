import { Stack } from 'expo-router';
import { CustomerRoute } from '@components/auth/CustomerRoute';

export default function TreatmentLayout() {
  return (
    <CustomerRoute pathParams={['treatmentId']}>
      <Stack screenOptions={{ headerShown: false }} />
    </CustomerRoute>
  );
}
