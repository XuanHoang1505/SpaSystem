import { CustomerRoute } from '@components/auth/CustomerRoute';
import { CartScreen } from '@/features/orders';

export default function CartRoute() {
  return (
    <CustomerRoute>
      <CartScreen />
    </CustomerRoute>
  );
}
