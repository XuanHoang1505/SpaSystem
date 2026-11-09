import { useSearchParams } from 'react-router-dom';
import { CheckoutView } from '@/features/orders';

export function CheckoutPage() {
  const [search] = useSearchParams();
  return <CheckoutView search={search} />;
}
