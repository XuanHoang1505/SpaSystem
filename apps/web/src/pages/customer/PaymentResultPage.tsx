import { useSearchParams } from 'react-router-dom';
import { PaymentResultView } from '@/features/orders';

export function PaymentResultPage() {
  const [search] = useSearchParams();
  return <PaymentResultView search={search} />;
}
