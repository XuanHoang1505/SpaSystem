import { Slot } from 'expo-router';
import { CustomerRoute } from '@components/auth/CustomerRoute';

/** VNPay returns here with `orderId`: a guest signs in first and comes back to the same result. */
export default function PaymentLayout() {
  return (
    <CustomerRoute>
      <Slot />
    </CustomerRoute>
  );
}
