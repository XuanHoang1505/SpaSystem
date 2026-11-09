import { CartView } from '@/features/orders';
import { RelatedPackages } from '@/features/service-packages';

export function CartPage() {
  return <CartView suggestions={<RelatedPackages excludeId="" />} />;
}
