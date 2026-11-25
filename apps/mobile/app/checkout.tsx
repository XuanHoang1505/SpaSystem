import { CustomerRoute } from '@components/auth/CustomerRoute';
import { CheckoutScreen } from '@/features/orders';

export default function CheckoutRoute() {
  return (
    <CustomerRoute>
      <CheckoutScreen />
    </CustomerRoute>
  );
}
